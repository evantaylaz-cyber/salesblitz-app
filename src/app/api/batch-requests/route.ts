import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { consumeRun } from "@/lib/runs";
import { ToolName } from "@/lib/tools";

// POST — create a batch job with multiple accounts
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      toolName,
      batchType = "territory_mapping",
      accounts,
      sharedContext,
    } = body;

    // Validate tool
    if (!toolName || !["prospect_prep", "interview_prep"].includes(toolName)) {
      return NextResponse.json(
        { error: "Invalid or unsupported tool for batch mode" },
        { status: 400 }
      );
    }

    // Validate accounts array
    if (!accounts || !Array.isArray(accounts) || accounts.length < 2 || accounts.length > 10) {
      return NextResponse.json(
        { error: "Batch requires 2-10 accounts" },
        { status: 400 }
      );
    }

    // Validate each account has required fields
    for (let i = 0; i < accounts.length; i++) {
      const acct = accounts[i];
      if (!acct.targetName || !acct.targetCompany) {
        return NextResponse.json(
          { error: `Account ${i + 1} missing required fields (targetName, targetCompany)` },
          { status: 400 }
        );
      }
    }

    // Validate batch type
    if (!["territory_mapping", "multi_threading", "competitive_sweep"].includes(batchType)) {
      return NextResponse.json(
        { error: "Invalid batchType. Must be territory_mapping, multi_threading, or competitive_sweep" },
        { status: 400 }
      );
    }

    // Find internal user
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Consume N runs (one per account) — Option 1 pricing
    const runsNeeded = accounts.length;
    const runResults = [];
    for (let i = 0; i < runsNeeded; i++) {
      const result = await consumeRun(dbUser.id, toolName as ToolName);
      if (!result.success) {
        return NextResponse.json(
          {
            error: `Insufficient runs. Consumed ${i} of ${runsNeeded} needed. ${result.error}`,
            runsConsumed: i,
            runsNeeded,
          },
          { status: 402 }
        );
      }
      runResults.push(result);
    }

    // Define batch-level orchestration steps
    const batchSteps = [
      { id: "per_account_research", label: "Per-Account Research", status: "pending" },
      { id: "comparative_synthesis", label: "Comparative Synthesis", status: "pending" },
      { id: "per_account_assets", label: "Per-Account Asset Generation", status: "pending" },
      { id: "batch_assets", label: "Batch Asset Generation", status: "pending" },
      { id: "formatting_qa", label: "Formatting & QA", status: "pending" },
      { id: "delivery", label: "Delivery", status: "pending" },
    ];

    // Create BatchJob
    const batchJob = await prisma.batchJob.create({
      data: {
        userId: dbUser.id,
        status: "submitted",
        batchType,
        toolName,
        accounts,
        sharedContext: sharedContext || null,
        steps: batchSteps,
        priority: dbUser.priorityProcessing || false,
      },
    });

    // Create child RunRequests for each account
    const childRequestIds: string[] = [];
    for (let i = 0; i < accounts.length; i++) {
      const acct = accounts[i];
      const childRequest = await prisma.runRequest.create({
        data: {
          userId: dbUser.id,
          toolName,
          targetName: acct.targetName,
          targetCompany: acct.targetCompany,
          targetRole: acct.targetRole || null,
          linkedinUrl: acct.linkedinUrl || null,
          linkedinText: acct.linkedinText || null,
          targetCompanyUrl: acct.targetCompanyUrl || null,
          additionalNotes: sharedContext?.additionalNotes || acct.additionalNotes || null,
          engagementType: sharedContext?.engagementType || acct.engagementType || "cold_outreach",
          priority: dbUser.priorityProcessing || false,
          status: "submitted",
          steps: [],
          batchJobId: batchJob.id,
          batchIndex: i,
        },
      });
      childRequestIds.push(childRequest.id);
    }

    // Trigger worker batch execution
    try {
      const workerRes = await fetch(process.env.WORKER_WEBHOOK_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || "",
        },
        body: JSON.stringify({
          batchJobId: batchJob.id,
          childRequestIds,
          isBatch: true,
        }),
      });
      console.log("Worker batch trigger response:", workerRes.status, "for batch:", batchJob.id);
    } catch (err) {
      console.error("Failed to trigger worker for batch:", batchJob.id, err);
    }

    return NextResponse.json({
      batchJobId: batchJob.id,
      childRequestIds,
      runsConsumed: runsNeeded,
      status: "submitted",
      accountCount: accounts.length,
    });
  } catch (err: unknown) {
    console.error("Batch request creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET — list current user's batch jobs
export async function GET(req: NextRequest) {
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

    const batchJobs = await prisma.batchJob.findMany({
      where: { userId: dbUser.id },
      include: {
        childRequests: {
          select: {
            id: true,
            targetName: true,
            targetCompany: true,
            status: true,
            batchIndex: true,
          },
          orderBy: { batchIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ batchJobs });
  } catch (err: unknown) {
    console.error("Batch list error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
