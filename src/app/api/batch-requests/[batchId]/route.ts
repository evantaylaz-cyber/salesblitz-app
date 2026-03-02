import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET - get a single batch job with progress data matching frontend interface
export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const batchJob = await prisma.batchJob.findUnique({
      where: { id: params.batchId },
      include: {
        childRequests: {
          orderBy: { batchIndex: "asc" },
        },
      },
    });

    if (!batchJob || batchJob.userId !== dbUser.id) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const childRequests = batchJob.childRequests || [];
    const totalAccounts = childRequests.length;
    const completedAccounts = childRequests.filter(
      (r: any) => r.status === "ready" || r.status === "delivered"
    ).length;
    const failedAccounts = childRequests.filter(
      (r: any) => r.status === "failed"
    ).length;
    const percentComplete = totalAccounts > 0
      ? Math.round((completedAccounts / totalAccounts) * 100)
      : 0;

    // Build accountStatuses from child requests
    const accounts = (batchJob.accounts || []) as any[];
    const accountStatuses = childRequests.map((cr: any, idx: number) => {
      const account = accounts[idx] || {};
      const steps = (cr.steps || []) as any[];
      const currentStep = steps.find((s: any) => s.status === "in_progress");
      return {
        id: cr.id,
        targetName: account.targetName || "Unknown",
        targetCompany: account.targetCompany || "Unknown",
        status: cr.status,
        currentStep: currentStep ? currentStep.label || currentStep.name : undefined,
        childRequestId: cr.id,
      };
    });

    // Build batch-level steps
    const batchSteps = (batchJob.steps || []) as any[];
    const defaultSteps = batchSteps.length > 0 ? batchSteps : [
      { name: "per_account_research", label: "Per-Account Research", status: completedAccounts === totalAccounts ? "completed" : completedAccounts > 0 ? "in_progress" : "pending" },
      { name: "comparative_synthesis", label: "Comparative Synthesis", status: batchJob.synthesisData ? "completed" : completedAccounts === totalAccounts ? "in_progress" : "pending" },
      { name: "batch_assets", label: "Batch Asset Generation", status: ((batchJob.batchAssets || []) as any[]).length > 0 ? "completed" : "pending" },
      { name: "delivery", label: "Delivery", status: batchJob.deliveredAt ? "completed" : "pending" },
    ];

    // Parse synthesis highlights
    const synthesis = batchJob.synthesisData as any;
    const synthesisHighlights = synthesis ? {
      topPriorityAccount: synthesis.priorityRanking?.[0]?.account || undefined,
      territoryStrategySummary: synthesis.territoryStrategy?.substring(0, 200) || undefined,
    } : undefined;

    // Parse batch assets into URL map
    const assets = (batchJob.batchAssets || []) as any[];
    const batchAssetUrls = assets.length > 0 ? {
      scorecardUrl: assets.find((a: any) => a.label === "scorecard")?.url,
      landscapeUrl: assets.find((a: any) => a.label === "landscape")?.url,
      strategyBriefUrl: assets.find((a: any) => a.label === "strategy_brief")?.url,
    } : undefined;

    return NextResponse.json({
      batchJob: {
        id: batchJob.id,
        toolName: batchJob.toolName,
        batchType: batchJob.batchType,
        status: batchJob.status,
        totalAccounts,
        completedAccounts,
        failedAccounts,
        percentComplete,
        steps: defaultSteps,
        accountStatuses,
        createdAt: batchJob.createdAt,
        updatedAt: batchJob.updatedAt,
        synthesisHighlights,
        batchAssets: batchAssetUrls,
      },
    });
  } catch (err) {
    console.error("[BATCH GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
