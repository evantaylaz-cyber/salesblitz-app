import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { stepEventBus } from "@/lib/step-events";

// Admin emails from env (comma-separated for multiple admins)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "evan.tay.laz@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

interface StepData {
  id: string;
  label: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface AssetData {
  id: string;
  label: string;
  format: string;
  url: string | null;
  size: number | null;
  category: string;
}

// PATCH — update step status and/or add assets
// Used by:
//   1. The execution engine (Phase 2) to report progress
//   2. Admin route for manual step management
//   3. Internal API key auth for serverless execution functions
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth: check for admin user OR internal API key
    const apiKey = req.headers.get("x-api-key");
    const isInternalCall = apiKey === process.env.INTERNAL_API_KEY;

    if (!isInternalCall) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { stepId, stepStatus, error, asset, researchData } = body;

    const request = await prisma.runRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const steps = (Array.isArray(request.steps) ? request.steps : []) as unknown as StepData[];
    const assets = (Array.isArray(request.assets) ? request.assets : []) as unknown as AssetData[];
    const updateData: Record<string, unknown> = {};

    // Update a step's status
    if (stepId && stepStatus) {
      const stepIndex = steps.findIndex((s: StepData) => s.id === stepId);
      if (stepIndex === -1) {
        return NextResponse.json({ error: "Step not found" }, { status: 404 });
      }

      steps[stepIndex].status = stepStatus;

      if (stepStatus === "in_progress") {
        steps[stepIndex].startedAt = new Date().toISOString();
        updateData.currentStep = stepId;

        // If this is the first step starting, update request status
        if (request.status === "submitted") {
          updateData.status = "researching";
          updateData.startedAt = new Date();
        }

        // If we're past research steps, update to "generating"
        if (stepId === "generating_assets" || stepId === "building_landscape_app" || stepId === "formatting") {
          updateData.status = "generating";
        }
      }

      if (stepStatus === "completed") {
        steps[stepIndex].completedAt = new Date().toISOString();
      }

      if (stepStatus === "failed" && error) {
        steps[stepIndex].error = error;
        updateData.status = "failed";
        updateData.errorMessage = error;
      }

      // Check if this is the last step completing (delivery)
      if (stepId === "delivery" && stepStatus === "completed") {
        updateData.status = "delivered";
        updateData.completedAt = new Date();
        updateData.deliveredAt = new Date();
      }

      // Check if the formatting step completed (assets ready)
      if (stepId === "formatting" && stepStatus === "completed") {
        updateData.status = "ready";
        updateData.completedAt = new Date();
      }

      updateData.steps = steps;
    }

    // Add or update a single asset (legacy format)
    if (asset) {
      const assetIndex = assets.findIndex((a: AssetData) => a.id === asset.id);
      if (assetIndex >= 0) {
        assets[assetIndex] = { ...assets[assetIndex], ...asset };
      } else {
        assets.push(asset);
      }
      updateData.assets = assets;
    }

    // Handle bulk assets from executor (format: { researchBrief: "url", povDeck: "url", ... })
    if (body.assets && typeof body.assets === "object" && !Array.isArray(body.assets)) {
      const assetMap = body.assets as Record<string, string>;
      for (const [key, url] of Object.entries(assetMap)) {
        if (typeof url === "string") {
          const existingIndex = assets.findIndex((a: AssetData) => a.id === key);
          const format = url.endsWith(".pdf") ? "pdf" : url.endsWith(".png") ? "png" : url.endsWith(".html") ? "html" : "other";
          const category = key.includes("Brief") || key.includes("Deck") ? "document"
            : key.includes("Card") || key.includes("Sheet") || key.includes("Img") ? "image"
            : key.includes("Landscape") ? "interactive" : "other";
          const assetEntry: AssetData = {
            id: key,
            label: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
            format,
            url,
            size: null,
            category,
          };
          if (existingIndex >= 0) {
            assets[existingIndex] = assetEntry;
          } else {
            assets.push(assetEntry);
          }
        }
      }
      updateData.assets = assets;
    }

    // Store research data (used by execution engine between steps)
    if (researchData) {
      updateData.researchData = researchData;
    }

    const updated = await prisma.runRequest.update({
      where: { id: params.id },
      data: updateData,
    });

    // Calculate progress for response
    const updatedSteps = (Array.isArray(updated.steps) ? updated.steps : []) as unknown as StepData[];
    const completedSteps = updatedSteps.filter((s) => s.status === "completed").length;
    const progress = updatedSteps.length > 0
      ? Math.round((completedSteps / updatedSteps.length) * 100)
      : 0;

    // Broadcast to any connected SSE clients
    const updatedAssets = (Array.isArray(updated.assets) ? updated.assets : []) as unknown as AssetData[];
    stepEventBus.publish(params.id, {
      requestId: params.id,
      stepId: stepId || "",
      stepStatus: stepStatus || "",
      status: updated.status,
      currentStep: updated.currentStep,
      progress,
      completedSteps,
      totalSteps: updatedSteps.length,
      steps: updatedSteps.map((s) => ({
        id: s.id,
        label: s.label,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        error: s.error,
      })),
      assets: updatedAssets.map((a) => ({
        id: a.id,
        label: a.label,
        format: a.format,
        url: a.url,
      })),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      status: updated.status,
      currentStep: updated.currentStep,
      progress,
      completedSteps,
      totalSteps: updatedSteps.length,
    });
  } catch (error) {
    console.error("Update step error:", error);
    return NextResponse.json(
      { error: "Failed to update step" },
      { status: 500 }
    );
  }
}
