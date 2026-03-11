import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { analyzeMeetingTranscript } from "@/lib/meeting-analysis";

const MAX_TRANSCRIPT_LENGTH = 500000; // 500K chars hard limit

// POST: upload a meeting transcript (text or audio reference)
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
      transcript,
      audioUrl,
      audioDuration,
      targetId,
      runRequestId,
      meetingType,
      meetingTitle,
      attendees,
      meetingDate,
      platform,
      transcriptSource,
    } = body;

    if (!transcript && !audioUrl) {
      return NextResponse.json(
        { error: "Either transcript text or audioUrl is required" },
        { status: 400 }
      );
    }

    // Validate transcript length
    if (transcript && typeof transcript === "string" && transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        { error: `Transcript too long. Max ${MAX_TRANSCRIPT_LENGTH.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

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

    // Validate meetingDate if provided
    let parsedDate: Date | null = null;
    if (meetingDate) {
      parsedDate = new Date(meetingDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid meeting date" },
          { status: 400 }
        );
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
        attendees: Array.isArray(attendees) ? attendees : null,
        meetingDate: parsedDate,
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
      analyzeMeetingTranscript(recording.id, transcript, user.id).catch(
        (err) => {
          console.error("[MEETING] Analysis failed for", recording.id, err);
        }
      );
    }

    return NextResponse.json(
      {
        recording: {
          id: recording.id,
          status: recording.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[MEETING] Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: list user's meeting recordings
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
