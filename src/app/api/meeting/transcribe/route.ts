import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { analyzeMeetingTranscript } from "@/lib/meeting-analysis";

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
      // Validate ownership of linked entities
      if (targetId) {
        const target = await prisma.target.findFirst({
          where: { id: targetId, userId: user.id },
        });
        if (!target) {
          return NextResponse.json({ error: "Target not found" }, { status: 404 });
        }
      }
      if (runRequestId) {
        const run = await prisma.runRequest.findFirst({
          where: { id: runRequestId, userId: user.id },
        });
        if (!run) {
          return NextResponse.json({ error: "Run request not found" }, { status: 404 });
        }
      }

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

    let whisperData;
    try {
      whisperData = await whisperResponse.json();
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).meetingRecording.update({
        where: { id: activeRecordingId },
        data: { status: "failed", errorMessage: "Failed to parse Whisper response" },
      });
      return NextResponse.json({ error: "Failed to parse transcription response" }, { status: 502 });
    }

    const transcript = typeof whisperData.text === "string" ? whisperData.text : "";
    if (!transcript) {
      console.warn("[TRANSCRIBE] Whisper returned empty transcript");
    }
    const duration = typeof whisperData.duration === "number"
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

    // Fire-and-forget analysis (uses shared pipeline)
    analyzeMeetingTranscript(activeRecordingId, transcript, user.id).catch(
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
