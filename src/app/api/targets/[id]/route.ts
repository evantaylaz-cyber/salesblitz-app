import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET — full detail for a single target with all activity
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const target = await prisma.target.findUnique({
      where: { id: params.id },
      include: {
        runRequests: {
          select: {
            id: true,
            toolName: true,
            status: true,
            targetCompany: true,
            targetContact: true,
            meetingType: true,
            createdAt: true,
            completedAt: true,
            researchData: true,
            debriefs: {
              select: {
                id: true,
                content: true,
                outcome: true,
                nextSteps: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        practiceSessions: {
          select: {
            id: true,
            targetRole: true,
            outcome: true,
            cotmScore: true,
            overallFeedback: true,
            completedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    // Verify ownership
    if (target.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Count debriefs across all run requests
    const totalDebriefs = target.runRequests.reduce(
      (sum, rr) => sum + rr.debriefs.length,
      0
    );

    // Classify intel depth
    const intelLength = target.accumulatedIntel?.length || 0;
    const intelDepth =
      intelLength > 3000
        ? "deep"
        : intelLength > 1000
        ? "moderate"
        : intelLength > 0
        ? "light"
        : "none";

    return NextResponse.json({
      target: {
        id: target.id,
        companyName: target.companyName,
        contactName: target.contactName,
        contactTitle: target.contactTitle,
        type: target.type,
        status: target.status,
        roundCount: target.roundCount,
        accumulatedIntel: target.accumulatedIntel,
        intelDepth,
        notes: target.notes,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
        counts: {
          blitzes: target.runRequests.length,
          practices: target.practiceSessions.length,
          debriefs: totalDebriefs,
        },
        runRequests: target.runRequests.map((rr) => ({
          id: rr.id,
          toolName: rr.toolName,
          status: rr.status,
          targetCompany: rr.targetCompany,
          targetContact: rr.targetContact,
          meetingType: rr.meetingType,
          createdAt: rr.createdAt,
          completedAt: rr.completedAt,
          hasResearch: !!rr.researchData,
          debriefs: rr.debriefs,
        })),
        practiceSessions: target.practiceSessions,
      },
    });
  } catch (error) {
    console.error("[TARGET] Error fetching target:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH — update target status or notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const target = await prisma.target.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    if (target.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { status, notes, contactName, contactTitle } = body;

    const updateData: Record<string, any> = {};
    if (status && ["active", "paused", "closed", "won", "lost"].includes(status)) {
      updateData.status = status;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (contactName !== undefined) {
      updateData.contactName = contactName;
    }
    if (contactTitle !== undefined) {
      updateData.contactTitle = contactTitle;
    }

    const updated = await prisma.target.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ target: updated });
  } catch (error) {
    console.error("[TARGET] Error updating target:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
