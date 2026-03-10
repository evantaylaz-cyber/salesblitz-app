import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { initializeSteps, getExpectedAssets } from "@/lib/job-steps";
import { ToolName } from "@/lib/tools";
import { triggerWorker } from "@/lib/trigger-worker";

// POST — retry a failed or stalled request (does NOT consume another run credit)
export async function POST(
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

    const request = await prisma.runRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Ensure user owns this request
    if (request.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Allow retry on failed requests, or stalled requests (submitted/researching with no progress)
    const retryableStatuses = ["failed", "submitted"];
    const isStalled = request.status === "researching" && !request.startedAt;
    if (!retryableStatuses.includes(request.status) && !isStalled) {
      return NextResponse.json(
        { error: "Only failed or stalled requests can be retried" },
        { status: 400 }
      );
    }

    // Reinitialize steps and expected assets
    const steps = initializeSteps(request.toolName as ToolName);
    const expectedAssets = getExpectedAssets(request.toolName as ToolName);

    // Reset the request to submitted state
    const updated = await prisma.runRequest.update({
      where: { id: params.id },
      data: {
        status: "submitted",
        errorMessage: null,
        steps: JSON.parse(JSON.stringify(steps)),
        assets: JSON.parse(JSON.stringify(expectedAssets.map(a => ({ ...a, url: null, size: null })))),
        currentStep: null,
        researchData: null,
      },
    });

    // Re-trigger the worker with retry logic
    const workerResult = await triggerWorker({ requestId: request.id });
    if (!workerResult.success) {
      console.error(
        `Worker retry trigger failed after ${workerResult.attempt} attempts for request ${request.id}: ${workerResult.error}`
      );
      // Don't fail the retry — the request is reset, worker polling will pick it up
    }

    return NextResponse.json({
      success: true,
      requestId: updated.id,
      message: "Request has been resubmitted",
    });
  } catch (error) {
    console.error("Retry request error:", error);
    return NextResponse.json(
      { error: "Failed to retry request" },
      { status: 500 }
    );
  }
}
