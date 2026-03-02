import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// PATCH - worker updates batch-level step progress
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId } = await context.params;
    const body = await request.json();
    const {
      stepId,
      status: stepStatus,
      data: stepData,
      batchStatus,
      synthesisData,
      batchAssets,
      errorMessage,
    } = body;

    const updateData: any = {};

    if (batchStatus) {
      updateData.status = batchStatus;
      if (batchStatus === "ready" || batchStatus === "delivered") {
        updateData.completedAt = new Date();
      }
      if (batchStatus === "delivered") {
        updateData.deliveredAt = new Date();
      }
    }

    if (synthesisData) {
      updateData.synthesisData = synthesisData;
    }

    if (batchAssets) {
      updateData.batchAssets = batchAssets;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    if (stepId && stepStatus) {
      const batchJob = await prisma.batchJob.findUnique({
        where: { id: batchId },
        select: { steps: true },
      });
      const currentSteps = ((batchJob?.steps || []) as any[]);
      const existingIdx = currentSteps.findIndex((s: any) => s.name === stepId);
      const stepEntry = { name: stepId, status: stepStatus, ...(stepData && { data: stepData }) };
      if (existingIdx >= 0) {
        currentSteps[existingIdx] = stepEntry;
      } else {
        currentSteps.push(stepEntry);
      }
      updateData.steps = currentSteps;
    }

    const updated = await prisma.batchJob.update({
      where: { id: batchId },
      data: updateData,
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (err) {
    console.error("[BATCH STEPS PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
