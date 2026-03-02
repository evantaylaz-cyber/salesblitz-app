import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// PATCH — Worker calls this to update batch-level step status
// Auth: x-api-key header (same as worker webhook auth)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    // Verify internal API key
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId } = await params;
    const body = await req.json();
    const { stepId, status, error: stepError, batchStatus, synthesisData, batchAssets } = body;

    const batchJob = await prisma.batchJob.findUnique({
      where: { id: batchId },
    });

    if (!batchJob) {
      return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    // Update a specific step
    if (stepId && status) {
      const steps = (batchJob.steps as any[]) || [];
      const stepIndex = steps.findIndex((s: any) => s.id === stepId);
      if (stepIndex >= 0) {
        steps[stepIndex].status = status;
        if (status === "in_progress") {
          steps[stepIndex].startedAt = new Date().toISOString();
        }
        if (status === "completed" || status === "failed") {
          steps[stepIndex].completedAt = new Date().toISOString();
        }
        if (stepError) {
          steps[stepIndex].error = stepError;
        }
        updates.steps = steps;
      }
    }

    // Update batch-level status
    if (batchStatus) {
      updates.status = batchStatus;
      if (batchStatus === "ready") {
        updates.completedAt = new Date();
      }
      if (batchStatus === "delivered") {
        updates.deliveredAt = new Date();
      }
    }

    // Store synthesis data
    if (synthesisData) {
      updates.synthesisData = synthesisData;
    }

    // Update batch assets
    if (batchAssets) {
      updates.batchAssets = batchAssets;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.batchJob.update({
        where: { id: batchId },
        data: updates,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update batch steps error:", error);
    return NextResponse.json(
      { error: "Failed to update batch steps" },
      { status: 500 }
    );
  }
}
