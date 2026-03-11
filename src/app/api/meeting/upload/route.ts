import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// POST — upload a meeting transcript (text or audio reference)
// Sources: manual paste, file upload, or Chrome extension auto-upload
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

    const body = await req.json();
    const {
      transcript,       // Raw transcript text (required if no audioUrl)
      audioUrl,         // Supabase storage URL (if audio was captured by extension)
      audioDuration,    // Seconds (from extension)
      targetId,         // Optional: link to existing Target
      runRequestId,     // Optional: link to existing blitz
      meetingType,      // discovery | demo | negotiation | interview | follow_up | other
      meetingTitle,     // "Round 2 with Acme" or auto-detected
      attendees,        // [{name, title?, company?, role?}]
      meetingDate,      // ISO string
      platform,         // google_meet | zoom | teams | phone | other
      transcriptSource, // extension_tab_capture | extension_mic | manual_upload | api
    } = body;

    if (!transcript && !audioUrl) {
      return NextResponse.json(
        { error: "Either transcript text or audioUrl is required" },
        { status: 400 }
      );
    }

    // If targetId provided, verify ownership
    if (targetId) {
      const target = await prisma.target.findFirst({
        where: { id: targetId, userId: user.id },
      });
      if (!target) {
        return NextResponse.json({ error: "Target not found" }, { status: 404 });
      }
    }

    // If runRequestId provided, verify ownership
    if (runRequestId) {
      const run = await prisma.runRequest.findFirst({
        where: { id: runRequestId, userId: user.id },
      });
      if (!run) {
        return NextResponse.json({ error: "Run request not found" }, { status: 404 });
      }
    }

    // Create recording record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recording = await (prisma as any).meetingRecording.create({
      data: {
        userId: user.id,
        targetId: targetId || null,
        runRequestId: runRequestId || null,
        meetingType: meetingType || null,
        meetingTitle: meetingTitle || null,
        attendees: attendees || null,
        meetingDate: meetingDate ? new Date(meetingDate) : null,
        platform: platform || null,
        audioUrl: audioUrl || null,
        audioDuration: audioDuration || null,
        rawTranscript: typeof transcript === "string" ? transcript : null,
        transcript: null, // Will be structured by analysis step
        transcriptSource: transcriptSource || "manual_upload",
        status: audioUrl && !transcript ? "transcribing" : "analyzing",
      },
    });

    // If we have text, kick off analysis immediately (async, non-blocking)
    if (transcript) {
      // Fire-and-forget analysis
      analyzeTranscript(recording.id, transcript, user.id).catch((err) => {
        console.error("[MEETING] Analysis failed for", recording.id, err);
      });
    }

    return NextResponse.json({
      recording: {
        id: recording.id,
        status: recording.status,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[MEETING] Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Async analysis pipeline: transcript → Claude → structured debrief → intel accumulation
async function analyzeTranscript(recordingId: string, rawTranscript: string, userId: string) {
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
    // Truncate to ~50K chars to stay within context window
    const truncated = rawTranscript.slice(0, 50000);

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
      throw new Error(`Claude API error: ${response.status} ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON from response (handle potential markdown wrapping)
    let analysis;
    try {
      const jsonStr = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse analysis JSON: ${text.slice(0, 200)}`);
    }

    // Structure transcript into segments if possible
    const transcriptSegments = parseTranscriptSegments(rawTranscript);

    // Update recording with analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.update({
      where: { id: recordingId },
      data: {
        transcript: transcriptSegments,
        analysis,
        outcome: analysis.outcome || "unknown",
        overallScore: typeof analysis.overallScore === "number" ? analysis.overallScore : null,
        meetingType: analysis.meetingType || null,
        attendees: analysis.attendees || null,
        status: "completed",
      },
    });

    // Accumulate intel into Target (if linked)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recording = await (prisma as any).meetingRecording.findUnique({
      where: { id: recordingId },
      select: { targetId: true },
    });

    if (recording?.targetId) {
      await accumulateIntel(recording.targetId, analysis);
    }
  } catch (error) {
    console.error("[MEETING] Analysis pipeline failed:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.update({
      where: { id: recordingId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Analysis failed",
      },
    });
  }
}

// Parse raw transcript text into structured segments
function parseTranscriptSegments(raw: string): Array<{ speaker?: string; text: string }> {
  const lines = raw.split("\n").filter((l) => l.trim());
  const segments: Array<{ speaker?: string; text: string }> = [];

  // Try to detect speaker labels like "John:", "Speaker 1:", "[John]", etc.
  const speakerPattern = /^(?:\[([^\]]+)\]|([A-Z][a-zA-Z\s.'-]+):)\s*(.+)/;

  for (const line of lines) {
    const match = line.match(speakerPattern);
    if (match) {
      segments.push({
        speaker: (match[1] || match[2]).trim(),
        text: match[3].trim(),
      });
    } else if (line.trim()) {
      // No speaker label — append to previous segment or create new
      if (segments.length > 0 && !segments[segments.length - 1].speaker) {
        segments[segments.length - 1].text += " " + line.trim();
      } else {
        segments.push({ text: line.trim() });
      }
    }
  }

  return segments;
}

// Accumulate meeting intel into Target.accumulatedIntel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function accumulateIntel(targetId: string, analysis: any) {
  try {
    const target = await prisma.target.findUnique({
      where: { id: targetId },
      select: { accumulatedIntel: true },
    });

    const intelLines = [
      `[Real Call ${new Date().toISOString().slice(0, 10)}]`,
      analysis.outcome ? `Outcome: ${analysis.outcome} (${analysis.overallScore}/5)` : "",
      analysis.summary ? `Summary: ${analysis.summary}` : "",
      analysis.objections?.length
        ? `Objections: ${analysis.objections.map((o: { objection: string }) => o.objection).join("; ")}`
        : "",
      analysis.dealQualification?.gaps?.length
        ? `Gaps: ${analysis.dealQualification.gaps.join("; ")}`
        : "",
      analysis.commitments?.length
        ? `Commitments: ${analysis.commitments.map((c: { what: string }) => c.what).join("; ")}`
        : "",
      analysis.nextSteps?.length
        ? `Next: ${analysis.nextSteps.join("; ")}`
        : "",
    ].filter(Boolean).join(" | ");

    const existing = target?.accumulatedIntel || "";
    const combined = `${intelLines}\n${existing}`.slice(0, 5000);

    await prisma.target.update({
      where: { id: targetId },
      data: { accumulatedIntel: combined },
    });
  } catch (err) {
    console.warn("[MEETING] Intel accumulation failed (non-fatal):", err);
  }
}

// GET — list user's meeting recordings
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("targetId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordings = await (prisma as any).meetingRecording.findMany({
      where: {
        userId: user.id,
        ...(targetId ? { targetId } : {}),
      },
      select: {
        id: true,
        meetingType: true,
        meetingTitle: true,
        meetingDate: true,
        platform: true,
        audioDuration: true,
        outcome: true,
        overallScore: true,
        status: true,
        transcriptSource: true,
        createdAt: true,
        targetId: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ recordings });
  } catch (error) {
    console.error("[MEETING] List error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
