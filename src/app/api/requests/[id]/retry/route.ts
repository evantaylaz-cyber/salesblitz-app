import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { initializeSteps, getExpectedAssets } from "@/lib/job-steps";
import { ToolName } from "@/lib/tools";

// POST — retry a failed request (does NOT consume another run credit)
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

    // Only allow retry on failed requests
    if (request.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed requests can be retried" },
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
        researchData: Prisma.DbNull,
      },
    });

    // Re-trigger the worker
    if (process.env.WORKER_WEBHOOK_URL) {
      try {
        const workerRes = await fetch(process.env.WORKER_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.INTERNAL_API_KEY || "",
          },
          body: JSON.stringify({ requestId: request.id }),
        });
        console.log("Worker retry trigger response:", workerRes.status, "for request:", request.id);
      } catch (err) {
        console.error("Worker retry trigger failed:", err);
        // Don't fail the retry — the request is reset, worker polling will pick it up
      }
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
