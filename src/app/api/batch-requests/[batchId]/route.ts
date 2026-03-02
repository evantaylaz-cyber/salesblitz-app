import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await context.params;
    console.log("[BATCH GET] batchId:", batchId);

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[BATCH GET] clerkUser:", clerkUser.id);

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log("[BATCH GET] dbUser:", dbUser.id);

    const batchJob = await prisma.batchJob.findUnique({
      where: { id: batchId },
      include: { childRequests: true },
    });

    console.log("[BATCH GET] batchJob found:", !!batchJob);

    if (!batchJob) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batchJob.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Map backend status to frontend status
    const statusMap: Record<string, string> = {
      submitted: "processing",
      researching: "processing",
      synthesizing: "processing",
      awaiting_clarification: "awaiting_clarification",
      ready: "completed",
      delivered: "completed",
      failed: "failed",
    };

    const children = batchJob.childRequests || [];

    const completedCount = children.filter(
      (r: any) => r.status === "ready" || r.status === "delivered"
    ).length;

    const failedCount = children.filter(
      (r: any) => r.status === "failed"
    ).length;

    const awaitingCount = children.filter(
      (r: any) => r.status === "awaiting_clarification"
    ).length;

    const totalCount = children.length;

    // Derive batch status from children aggregate state
    // Children states take priority over parent batch job status
    let derivedStatus: string;
    if (totalCount === 0) {
      // No children yet - use parent status
      derivedStatus = statusMap[batchJob.status] || "processing";
    } else if (awaitingCount > 0) {
      // Any children awaiting clarification = batch awaiting
      derivedStatus = "awaiting_clarification";
    } else if (completedCount === totalCount) {
      derivedStatus = "completed";
    } else if (failedCount === totalCount) {
      derivedStatus = "failed";
    } else if (failedCount > 0 && completedCount > 0) {
      derivedStatus = "partial";
    } else {
      // Still processing
      derivedStatus = statusMap[batchJob.status] || "processing";
    }

    // Calculate percent complete based on actual children states
    let percentComplete = 0;
    if (totalCount > 0) {
      percentComplete = Math.round((completedCount / totalCount) * 100);
    }
    // Only force 100% if no children exist and parent says completed
    if (derivedStatus === "completed" && totalCount === 0) {
      percentComplete = 100;
    }

    // Build account statuses from child requests
    const accountStatuses = children.map((r: any) => ({
      requestId: r.id,
      targetName: r.targetName,
      targetCompany: r.targetCompany,
      status: statusMap[r.status] || "processing",
      percentComplete:
        r.status === "ready" || r.status === "delivered"
          ? 100
          : r.status === "failed"
          ? 0
          : r.status === "awaiting_clarification"
          ? 25
          : 50,
    }));

    // Parse steps - use batch steps if present, otherwise generate defaults
    let batchSteps: any[] = [];
    try {
      const rawSteps = batchJob.steps;
      if (Array.isArray(rawSteps) && rawSteps.length > 0) {
        batchSteps = rawSteps;
      }
    } catch (e) {
      console.log("[BATCH GET] Error parsing steps:", e);
    }

    if (batchSteps.length === 0) {
      const bStatus = derivedStatus;
      batchSteps = [
        {
          id: "per_account_research",
          label: "Per-Account Research",
          status: bStatus === "completed" ? "completed" : "in_progress",
        },
        {
          id: "comparative_synthesis",
          label: "Comparative Synthesis",
          status: bStatus === "completed" ? "completed" : "pending",
        },
        {
          id: "asset_generation",
          label: "Asset Generation",
          status: bStatus === "completed" ? "completed" : "pending",
        },
        {
          id: "delivery",
          label: "Delivery",
          status: bStatus === "completed" ? "completed" : "pending",
        },
      ];
    }

    // Parse synthesis highlights
    let synthesisHighlights: any = null;
    try {
      if (batchJob.synthesisData) {
        const sd = batchJob.synthesisData as any;
        if (sd.priorityRanking || sd.keyInsight || sd.highlights) {
          synthesisHighlights = sd;
        }
      }
    } catch (e) {
      console.log("[BATCH GET] Error parsing synthesis:", e);
    }

    // Parse batch asset URLs
    let batchAssetUrls: any[] = [];
    try {
      const rawAssets = batchJob.batchAssets;
      if (Array.isArray(rawAssets)) {
        batchAssetUrls = rawAssets;
      }
    } catch (e) {
      console.log("[BATCH GET] Error parsing assets:", e);
    }

    // Build merged response matching frontend interface
    const response = {
      batchJob: {
        id: batchJob.id,
        status: derivedStatus,
        batchType: batchJob.batchType,
        toolName: batchJob.toolName,
        accounts: batchJob.accounts,
        sharedContext: batchJob.sharedContext,
        priority: batchJob.priority,
        errorMessage: batchJob.errorMessage,
        createdAt: batchJob.createdAt,
        updatedAt: batchJob.updatedAt,
        completedAt: batchJob.completedAt,
        deliveredAt: batchJob.deliveredAt,

        // Merged progress fields
        totalAccounts: totalCount,
        completedAccounts: completedCount,
        failedAccounts: failedCount,
        awaitingAccounts: awaitingCount,
        percentComplete,
        steps: batchSteps,
        accountStatuses,
        synthesisHighlights,
        batchAssetUrls,
      },
    };

    console.log("[BATCH GET] Success, status:", response.batchJob.status);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[BATCH GET]", error?.constructor?.name, error?.message);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
