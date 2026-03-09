import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { normalizeAssets } from "@/lib/normalize-assets";

// GET — fetch a single batch job with all child requests + progress
export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
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

    const { batchId } = await params;

    const batchJob = await prisma.batchJob.findUnique({
      where: { id: batchId },
      include: {
        childRequests: {
          orderBy: { batchIndex: "asc" },
        },
      },
    });

    if (!batchJob) {
      return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
    }

    // Verify ownership
    if (batchJob.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Normalize assets for each child request
    const normalizedChildren = batchJob.childRequests.map((r: any) => ({
      ...r,
      assets: normalizeAssets(r.assets, r.toolName),
    }));

    // Calculate progress
    const totalChildren = normalizedChildren.length;
    const completedChildren = normalizedChildren.filter(
      (r: any) => r.status === "ready" || r.status === "delivered"
    ).length;
    const failedChildren = normalizedChildren.filter(
      (r: any) => r.status === "failed"
    ).length;

    const batchSteps = (batchJob.steps as any[]) || [];
    const completedBatchSteps = batchSteps.filter(
      (s: any) => s.status === "completed"
    ).length;

    // Overall progress: weight children at 60%, batch steps at 40%
    const childProgress = totalChildren > 0
      ? (completedChildren / totalChildren) * 60
      : 0;
    const batchStepProgress = batchSteps.length > 0
      ? (completedBatchSteps / batchSteps.length) * 40
      : 0;
    const overallProgress = Math.round(childProgress + batchStepProgress);

    return NextResponse.json({
      batchJob: {
        ...batchJob,
        childRequests: normalizedChildren,
      },
      progress: {
        overall: overallProgress,
        accounts: {
          total: totalChildren,
          completed: completedChildren,
          failed: failedChildren,
          inProgress: totalChildren - completedChildren - failedChildren,
        },
        batchSteps: {
          total: batchSteps.length,
          completed: completedBatchSteps,
        },
      },
    });
  } catch (error) {
    console.error("Fetch batch job error:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch job" },
      { status: 500 }
    );
  }
}
