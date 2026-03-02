import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { consumeRun } from "@/lib/runs";
import { ToolName } from "@/lib/tools";
import { initializeSteps, getExpectedAssets } from "@/lib/job-steps";

// Batch-level step templates
function initializeBatchSteps(accountCount: number) {
  return [
    { id: "parallel_research", label: `Researching ${accountCount} accounts in parallel`, status: "pending" },
    { id: "comparative_synthesis", label: "Running comparative analysis", status: "pending" },
    { id: "per_account_assets", label: "Generating per-account deliverables", status: "pending" },
    { id: "batch_assets", label: "Building batch-level scorecard & landscape", status: "pending" },
    { id: "qa", label: "Quality assurance check", status: "pending" },
    { id: "delivery", label: "Delivering to your inbox", status: "pending" },
  ];
}

// GET — list current user's batch jobs
export async function GET() {
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

    const batchJobs = await prisma.batchJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        childRequests: {
          select: {
            id: true,
            status: true,
            targetName: true,
            targetCompany: true,
            batchIndex: true,
            currentStep: true,
            assets: true,
          },
          orderBy: { batchIndex: "asc" },
        },
      },
    });

    return NextResponse.json({ batchJobs });
  } catch (error) {
    console.error("Fetch batch jobs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch jobs" },
      { status: 500 }
    );
  }
}

// POST — submit a new batch request (consumes N runs, creates BatchJob + N child RunRequests)
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      toolName,
      batchType = "territory_mapping",
      accounts,
      sharedContext,
    } = body;

    // Validate required fields
    if (!toolName) {
      return NextResponse.json({ error: "toolName is required" }, { status: 400 });
    }

    if (!Array.isArray(accounts) || accounts.length < 2) {
      return NextResponse.json(
        { error: "accounts must be an array with at least 2 entries" },
        { status: 400 }
      );
    }

    if (accounts.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 accounts per batch" },
        { status: 400 }
      );
    }

    // Validate each account has required fields
    for (let i = 0; i < accounts.length; i++) {
      const acct = accounts[i];
      if (!acct.targetName || !acct.targetCompany) {
        return NextResponse.json(
          { error: `Account ${i + 1} is missing targetName or targetCompany` },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Consume N runs (one per account) — fail fast if insufficient
    const runResults = [];
    for (let i = 0; i < accounts.length; i++) {
      const result = await consumeRun(user.id, toolName as ToolName);
      if (!result.success) {
        // Refund already-consumed runs by incrementing back
        // Note: consumeRun already decremented, so we need to add back
        if (i > 0) {
          // Best-effort refund: increment subscription runs back
          // In production, this should be a transaction. For now, log the issue.
          console.error(
            `[BATCH] Partial run consumption: consumed ${i} of ${accounts.length} runs for user ${user.id}. ` +
            `Manual refund may be needed.`
          );
        }
        return NextResponse.json(
          {
            error: `Insufficient runs. Need ${accounts.length} runs, only ${i} were available. ${result.error}`,
          },
          { status: 403 }
        );
      }
      runResults.push(result);
    }

    // Initialize per-account steps and assets
    const perAccountSteps = initializeSteps(toolName as ToolName);
    const perAccountAssets = getExpectedAssets(toolName as ToolName);

    // Create BatchJob
    const batchJob = await prisma.batchJob.create({
      data: {
        userId: user.id,
        toolName,
        batchType,
        accounts: JSON.parse(JSON.stringify(accounts)),
        sharedContext: sharedContext ? JSON.parse(JSON.stringify(sharedContext)) : null,
        priority: user.priorityProcessing,
        status: "submitted",
        steps: JSON.parse(JSON.stringify(initializeBatchSteps(accounts.length))),
        batchAssets: JSON.parse(JSON.stringify([])),
      },
    });

    // Create N child RunRequests
    const childRequestIds: string[] = [];
    for (let i = 0; i < accounts.length; i++) {
      const acct = accounts[i];
      const childRequest = await prisma.runRequest.create({
        data: {
          userId: user.id,
          toolName,
          targetName: acct.targetName,
          targetCompany: acct.targetCompany,
          targetRole: acct.targetRole || null,
          jobDescription: acct.jobDescription || null,
          linkedinUrl: acct.linkedinUrl || null,
          linkedinText: acct.linkedinText || null,
          additionalNotes: acct.additionalNotes || sharedContext?.additionalNotes || null,
          targetCompanyUrl: acct.targetCompanyUrl || null,
          engagementType: sharedContext?.engagementType || "cold_outreach",
          meetingDate: acct.meetingDate || null,
          priorInteractions: acct.priorInteractions || null,
          priority: user.priorityProcessing,
          status: "submitted",
          steps: JSON.parse(JSON.stringify(perAccountSteps)),
          assets: JSON.parse(JSON.stringify(perAccountAssets.map(a => ({ ...a, url: null, size: null })))),
          currentStep: null,
          batchJobId: batchJob.id,
          batchIndex: i,
        },
      });
      childRequestIds.push(childRequest.id);
    }

    // Trigger the worker's batch execution endpoint
    if (process.env.WORKER_WEBHOOK_URL) {
      try {
        // Worker batch endpoint is at /execute-batch (same base, different path)
        const batchUrl = process.env.WORKER_WEBHOOK_URL.replace("/execute", "/execute-batch");
        const workerRes = await fetch(batchUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.INTERNAL_API_KEY || "",
          },
          body: JSON.stringify({
            batchJobId: batchJob.id,
            childRequestIds,
          }),
        });
        console.log(
          "Worker batch trigger response:",
          workerRes.status,
          "for batch:",
          batchJob.id,
          `(${childRequestIds.length} accounts)`
        );
      } catch (err) {
        console.error("Worker batch trigger failed:", err);
      }
    } else {
      console.warn("WORKER_WEBHOOK_URL not set — skipping worker trigger");
    }

    return NextResponse.json({
      success: true,
      batchJobId: batchJob.id,
      childRequestIds,
      runsConsumed: accounts.length,
      runsRemaining: runResults[runResults.length - 1]?.runsRemaining ?? 0,
    });
  } catch (error) {
    console.error("Create batch request error:", error);
    return NextResponse.json(
      { error: "Failed to create batch request" },
      { status: 500 }
    );
  }
}
