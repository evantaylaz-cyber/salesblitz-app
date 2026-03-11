import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// POST — transcribe audio via OpenAI Whisper API
// Accepts: multipart form data with audio file + optional metadata
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Transcription service not configured" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const recordingId = formData.get("recordingId") as string | null;
    const targetId = formData.get("targetId") as string | null;
    const runRequestId = formData.get("runRequestId") as string | null;
    const meetingType = formData.get("meetingType") as string | null;
    const meetingTitle = formData.get("meetingTitle") as string | null;
    const platform = formData.get("platform") as string | null;
    const transcriptSource = formData.get("transcriptSource") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Validate file size (25MB Whisper limit)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Audio file too large. Max 25MB per chunk." },
        { status: 413 }
      );
    }

    // Validate mime type
    const validTypes = [
      "audio/webm", "audio/mp4", "audio/mpeg", "audio/mp3",
      "audio/wav", "audio/ogg", "audio/flac", "audio/m4a",
      "video/webm", "video/mp4", // TabCapture can produce video containers
    ];
    if (!validTypes.some((t) => audioFile.type.startsWith(t.split("/")[0]))) {
      // Be lenient, Whisper handles most formats
      console.warn(`[TRANSCRIBE] Unusual mime type: ${audioFile.type}`);
    }

    // If recordingId provided, verify ownership and update status
    if (recordingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await (prisma as any).meetingRecording.findFirst({
        where: { id: recordingId, userId: user.id },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Recording not found" },
          { status: 404 }
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).meetingRecording.update({
        where: { id: recordingId },
        data: { status: "transcribing" },
      });
    }

    // Create a new recording if none provided
    let activeRecordingId: string = recordingId || "";
    if (!activeRecordingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recording = await (prisma as any).meetingRecording.create({
        data: {
          userId: user.id,
          targetId: targetId || null,
          runRequestId: runRequestId || null,
          meetingType: meetingType || null,
          meetingTitle: meetingTitle || null,
          platform: platform || null,
          transcriptSource: transcriptSource || "extension_tab_capture",
          status: "transcribing",
          audioDuration: null,
        },
      });
      activeRecordingId = recording.id;
    }

    // Call Whisper API
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, audioFile.name || "recording.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "verbose_json");
    whisperForm.append("timestamp_granularities[]", "word");
    whisperForm.append("timestamp_granularities[]", "segment");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: whisperForm,
      }
    );

    if (!whisperResponse.ok) {
      const errText = await whisperResponse.text();
      console.error("[TRANSCRIBE] Whisper API error:", whisperResponse.status, errText);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).meetingRecording.update({
        where: { id: activeRecordingId },
        data: {
          status: "failed",
          errorMessage: `Whisper API error: ${whisperResponse.status}`,
        },
      });

      return NextResponse.json(
        { error: "Transcription failed", detail: errText.slice(0, 200) },
        { status: 502 }
      );
    }

    const whisperData = await whisperResponse.json();
    const transcript = whisperData.text || "";
    const duration = whisperData.duration
      ? Math.round(whisperData.duration)
      : null;

    // Build structured segments from Whisper's segment data
    const segments = (whisperData.segments || []).map(
      (seg: { start: number; end: number; text: string }) => ({
        text: seg.text.trim(),
        startTime: seg.start,
        endTime: seg.end,
      })
    );

    // Update recording with transcript, kick off analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.update({
      where: { id: activeRecordingId },
      data: {
        rawTranscript: transcript,
        transcript: segments.length > 0 ? segments : null,
        audioDuration: duration,
        status: "analyzing",
      },
    });

    // Fire-and-forget analysis
    analyzeFromTranscript(activeRecordingId, transcript, user.id).catch(
      (err) => {
        console.error(
          "[TRANSCRIBE] Post-transcription analysis failed:",
          activeRecordingId,
          err
        );
      }
    );

    return NextResponse.json(
      {
        recordingId: activeRecordingId,
        transcript,
        duration,
        segmentCount: segments.length,
        status: "analyzing",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[TRANSCRIBE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Reuse the same analysis pipeline from upload route
async function analyzeFromTranscript(
  recordingId: string,
  transcript: string,
  userId: string
) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.update({
      where: { id: recordingId },
      data: { status: "failed", errorMessage: "No API key configured" },
    });
    return;
  }

  try {
    const truncated = transcript.slice(0, 50000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `You are analyzing a real sales or interview meeting transcript. Extract structured intelligence.

TRANSCRIPT:
${truncated}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "summary": "2-3 sentence summary of what happened in this meeting",
  "meetingType": "discovery | demo | negotiation | interview | follow_up | internal | other",
  "attendees": [{"name": "...", "title": "...", "company": "...", "role": "buyer | seller | interviewer | candidate | other"}],
  "keyMoments": [{"timestamp": "early | mid | late", "what": "...", "why": "why this matters for the deal/opportunity"}],
  "objections": [{"objection": "...", "response": "how it was handled", "effectiveness": "strong | adequate | weak | unaddressed"}],
  "commitments": [{"who": "...", "what": "...", "deadline": "..."}],
  "dealQualification": {
    "gaps": ["qualification gaps identified"],
    "strengths": ["areas where deal/opportunity is strong"],
    "riskLevel": "low | medium | high"
  },
  "coachingNotes": [{"dimension": "discovery | value_messaging | objection_handling | closing | rapport | qualification", "observation": "...", "suggestion": "..."}],
  "nextSteps": ["concrete next steps"],
  "outcome": "strong | developing | needs_work | unknown",
  "overallScore": 3.5
}

Score 0-5 where 5 = masterclass execution, 3 = competent, 1 = significant gaps.
Focus on actionable intelligence, not generic observations.
If the transcript is too short or unclear, still extract what you can and set outcome to "unknown".`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Claude API error: ${response.status} ${errText.slice(0, 200)}`
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    let analysis;
    try {
      const jsonStr = text
        .replace(/^```json?\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse analysis JSON: ${text.slice(0, 200)}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.update({
      where: { id: recordingId },
      data: {
        analysis,
        outcome: analysis.outcome || "unknown",
        overallScore:
          typeof analysis.overallScore === "number"
            ? analysis.overallScore
            : null,
        meetingType: analysis.meetingType || null,
        attendees: analysis.attendees || null,
        status: "completed",
      },
    });

    // Accumulate intel into Target if linked
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recording = await (prisma as any).meetingRecording.findUnique({
      where: { id: recordingId },
      select: { targetId: true },
    });

    if (recording?.targetId) {
      try {
        const target = await prisma.target.findUnique({
          where: { id: recording.targetId },
          select: { accumulatedIntel: true },
        });

        const intelLines = [
          `[Real Call ${new Date().toISOString().slice(0, 10)}]`,
          analysis.outcome
            ? `Outcome: ${analysis.outcome} (${analysis.overallScore}/5)`
            : "",
          analysis.summary ? `Summary: ${analysis.summary}` : "",
          analysis.objections?.length
            ? `Objections: ${analysis.objections.map((o: { objection: string }) => o.objection).join("; ")}`
            : "",
          analysis.nextSteps?.length
            ? `Next: ${analysis.nextSteps.join("; ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ");

        const existing = target?.accumulatedIntel || "";
        const combined = `${intelLines}\n${existing}`.slice(0, 5000);

        await prisma.target.update({
          where: { id: recording.targetId },
          data: { accumulatedIntel: combined },
        });
      } catch (err) {
        console.warn("[TRANSCRIBE] Intel accumulation failed (non-fatal):", err);
      }
    }
  } catch (error) {
    console.error("[TRANSCRIBE] Analysis pipeline failed:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.update({
      where: { id: recordingId },
      data: {
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Analysis failed",
      },
    });
  }
}
