import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getExpectedAssets } from "@/lib/job-steps";
import { ToolName } from "@/lib/tools";

// ── Worker → UI asset key mapping ──────────────────────────────────────
// The worker stores assets as a flat object with camelCase keys.
// The UI expects an array of AssetData objects keyed by template IDs.
// This map bridges the two formats.
const WORKER_KEY_TO_ASSET_ID: Record<string, string> = {
  briefPdf: "research_brief",
  povDeck: "pov_deck",
  clientPovCard: "handwritten_pov",
  callSheet1Img: "handwritten_callsheet_1",
  callSheet2ImgA: "handwritten_callsheet_2",
  callSheet2ImgB: "handwritten_callsheet_2b",
  landscape: "competitive_landscape_app",
  callPrepSheet: "call_prep_sheet",
  auditReport: "audit_report",
  atsResume: "ats_resume",
  dealHealthCard: "handwritten_health",
  strategyBrief: "strategy_brief",
  championPovCard: "handwritten_pov",
};

/**
 * Normalize assets into the array format the UI expects.
 * Handles three cases:
 *   1. Already an array (initial creation format) → return as-is
 *   2. Flat object from worker → merge URLs into the asset template
 *   3. Anything else → empty array
 */
function normalizeAssets(
  rawAssets: unknown,
  toolName: string
): { id: string; label: string; format: string; url: string | null; size: number | null; category: string }[] {
  // Case 1: Already the correct array format
  if (Array.isArray(rawAssets)) {
    return rawAssets;
  }

  // Case 2: Flat object from worker — reconstruct the array
  if (rawAssets && typeof rawAssets === "object" && !Array.isArray(rawAssets)) {
    const workerAssets = rawAssets as Record<string, string>;
    const template = getExpectedAssets(toolName as ToolName);

    // Start with template assets, fill in URLs from worker data
    const result = template.map((t) => ({
      id: t.id,
      label: t.label,
      format: t.format,
      url: null as string | null,
      size: null as number | null,
      category: t.category,
    }));

    // Map worker keys to template IDs and set URLs
    for (const [workerKey, url] of Object.entries(workerAssets)) {
      if (!url || typeof url !== "string") continue;

      const templateId = WORKER_KEY_TO_ASSET_ID[workerKey];
      if (templateId) {
        const existing = result.find((r) => r.id === templateId);
        if (existing) {
          existing.url = url;
        } else {
          // Worker produced an asset not in the template — add it
          const format = url.split(".").pop() || "pdf";
          result.push({
            id: templateId,
            label: workerKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
            format,
            url,
            size: null,
            category: "deliverable",
          });
        }
      } else {
        // Unknown worker key — still include it so users can access the asset
        const format = url.split(".").pop() || "pdf";
        result.push({
          id: workerKey,
          label: workerKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
          format,
          url,
          size: null,
          category: "deliverable",
        });
      }
    }

    return result;
  }

  // Case 3: null / undefined / unexpected
  return [];
}

// GET — fetch a single run request with full execution details
// Used for the detail page and live progress polling
export async function GET(
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

    // Ensure user can only see their own requests
    if (request.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse JSON fields for the response
    const steps = Array.isArray(request.steps) ? request.steps : [];
    const assets = normalizeAssets(request.assets, request.toolName);

    // Calculate progress
    const completedSteps = (steps as { status: string }[]).filter(
      (s) => s.status === "completed"
    ).length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return NextResponse.json({
      request: {
        ...request,
        steps,
        assets,
        progress,
        completedSteps,
        totalSteps,
      },
    });
  } catch (error) {
    console.error("Fetch request detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}
