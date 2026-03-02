import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// PATCH — worker updates batch-level step progress
export async function PATCH(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    // Authenticate via internal API key (worker-to-app calls)
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { stepId, status, data, batchStatus, synthesisData, batchAssets, errorMessage } = body;

    const batchJob = await prisma.batchJob.findUnique({
      where: { id: params.batchId },
    });

    if (!batchJob) {
      return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};

    // Update specific step if provided
    if (stepId && status) {
      const steps = (batchJob.steps as Array<{ id: string; label: string; status: string; data?: unknown }>) || [];
      const stepIndex = steps.findIndex((s) => s.id === stepId);
      if (stepIndex >= 0) {
        steps[stepIndex].status = status;
        if (data) steps[stepIndex].data = data;
      }
      updateData.steps = steps;
    }

    // Update batch-level status
    if (batchStatus) {
      updateData.status = batchStatus;
      if (batchStatus === "ready" || batchStatus === "delivered") {
        updateData.completedAt = new Date();
      }
      if (batchStatus === "delivered") {
        updateData.deliveredAt = new Date();
      }
    }

    // Update synthesis data
    if (synthesisData) {
      updateData.synthesisData = synthesisData;
    }

    // Update batch assets
    if (batchAssets) {
      updateData.batchAssets = batchAssets;
    }

    // Update error
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    const updated = await prisma.batchJob.update({
      where: { id: params.batchId },
      data: updateData,
    });

    return NextResponse.json({ success: true, batchJob: updated });
  } catch (err: unknown) {
    console.error("Batch step update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
