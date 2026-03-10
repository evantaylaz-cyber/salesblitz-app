import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET — list all targets for the authenticated user with activity counts
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

    const targets = await prisma.target.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            runRequests: true,
            practiceSessions: true,
          },
        },
        runRequests: {
          select: {
            id: true,
            toolName: true,
            status: true,
            targetCompany: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        practiceSessions: {
          select: {
            id: true,
            outcome: true,
            cotmScore: true,
            completedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    // Also count debriefs per target (via runRequests)
    const targetData = await Promise.all(
      targets.map(async (target) => {
        const debriefCount = await prisma.runDebrief.count({
          where: {
            runRequest: {
              targetId: target.id,
            },
          },
        });

        const intelLength = target.accumulatedIntel?.length || 0;

        return {
          id: target.id,
          companyName: target.companyName,
          contactName: target.contactName,
          contactTitle: target.contactTitle,
          type: target.type,
          status: target.status,
          roundCount: target.roundCount,
          intelDepth: intelLength > 3000 ? "deep" : intelLength > 1000 ? "moderate" : intelLength > 0 ? "light" : "none",
          intelPreview: target.accumulatedIntel?.slice(0, 200) || null,
          notes: target.notes,
          createdAt: target.createdAt,
          updatedAt: target.updatedAt,
          counts: {
            blitzes: target._count.runRequests,
            practices: target._count.practiceSessions,
            debriefs: debriefCount,
          },
          recentBlitzes: target.runRequests,
          recentPractice: target.practiceSessions,
        };
      })
    );

    return NextResponse.json({ targets: targetData });
  } catch (error) {
    console.error("[TARGETS] Error listing targets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
