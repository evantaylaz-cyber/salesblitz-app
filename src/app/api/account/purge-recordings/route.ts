import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// POST: purge recording transcript data
// Keeps rows + coaching analysis (scores, outcome, overallScore) but nulls out
// transcript, rawTranscript, audioUrl, and transcriptEmbedding.
//
// Body options:
//   { all: true }                    — purge all transcripts
//   { targetId: "..." }              — purge transcripts for a specific target/company
//   { before: "2026-01-01" }         — purge transcripts before a date
//   { recordingIds: ["id1", "id2"] } — purge specific recordings
//
// This is a soft purge: the MeetingRecording row stays (with analysis, scores,
// outcome intact) but verbatim transcript content is removed. This is the
// defensible line: coaching insights = professional development (stays),
// verbatim meeting content = ephemeral input (purged).

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
    const { all, targetId, before, recordingIds } = body;

    // Must specify at least one filter
    if (!all && !targetId && !before && !recordingIds) {
      return NextResponse.json(
        {
          error:
            "Specify at least one filter: all, targetId, before, or recordingIds",
        },
        { status: 400 }
      );
    }

    // Build the where clause — always scoped to this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      userId: user.id,
      // Only purge rows that still have transcript data
      OR: [
        { transcript: { not: null } },
        { rawTranscript: { not: null } },
      ],
    };

    if (targetId) {
      // Validate ownership
      const target = await prisma.target.findFirst({
        where: { id: targetId, userId: user.id },
      });
      if (!target) {
        return NextResponse.json(
          { error: "Target not found" },
          { status: 404 }
        );
      }
      where.targetId = targetId;
    }

    if (before) {
      const beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format for 'before'" },
          { status: 400 }
        );
      }
      where.createdAt = { lt: beforeDate };
    }

    if (recordingIds && Array.isArray(recordingIds)) {
      where.id = { in: recordingIds };
    }

    // Execute the purge: null out transcript content, keep analysis/scores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma as any).meetingRecording.updateMany({
      where,
      data: {
        transcript: null,
        rawTranscript: null,
        audioUrl: null,
        // Note: transcriptEmbedding can't be set via Prisma (Unsupported type)
        // We'll handle it via raw SQL below
        updatedAt: new Date(),
      },
    });

    // Also null out the vector embedding via raw SQL (Prisma can't touch Unsupported types)
    if (result.count > 0) {
      // Build the same filter for raw SQL
      let rawWhere = `"userId" = '${user.id}'`;
      if (targetId) rawWhere += ` AND "targetId" = '${targetId}'`;
      if (before)
        rawWhere += ` AND "createdAt" < '${new Date(before).toISOString()}'`;
      if (recordingIds && Array.isArray(recordingIds)) {
        const ids = recordingIds.map((id: string) => `'${id}'`).join(",");
        rawWhere += ` AND "id" IN (${ids})`;
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "MeetingRecording" SET "transcriptEmbedding" = NULL WHERE ${rawWhere} AND "transcriptEmbedding" IS NOT NULL`
      );
    }

    return NextResponse.json({
      success: true,
      purged: result.count,
      message: `Purged transcript data from ${result.count} recording(s). Coaching analysis and scores are preserved.`,
    });
  } catch (error) {
    console.error("[PURGE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
