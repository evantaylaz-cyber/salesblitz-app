import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { validateApiKey } from "@/lib/api-keys";
import { normalizeAssets } from "@/lib/normalize-assets";

/**
 * GET /api/webhooks/blitz/[id] — Check status of a webhook-triggered blitz.
 * Auth: API key with blitz:read scope.
 *
 * Response:
 *   {
 *     id, status, toolName, targetCompany, targetName,
 *     progress, completedSteps, totalSteps,
 *     assets: [{ id, label, format, url }],
 *     liveInsights: [{ step, insight, timestamp }],
 *     createdAt, startedAt, completedAt, deliveredAt
 *   }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    const apiKey = await validateApiKey(authHeader);

    if (!apiKey) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes : [];
    if (!scopes.includes("blitz:read")) {
      return NextResponse.json(
        { error: "API key does not have blitz:read scope" },
        { status: 403 }
      );
    }

    const request = await prisma.runRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Ownership check: key owner must match request owner (or team)
    if (request.userId !== apiKey.userId) {
      if (!apiKey.teamId || request.teamId !== apiKey.teamId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const steps = Array.isArray(request.steps) ? request.steps : [];
    const assets = normalizeAssets(request.assets, request.toolName);
    const completedSteps = (steps as { status: string }[]).filter(
      (s) => s.status === "completed"
    ).length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return NextResponse.json({
      id: request.id,
      status: request.status,
      toolName: request.toolName,
      targetCompany: request.targetCompany,
      targetName: request.targetName,
      progress,
      completedSteps,
      totalSteps,
      assets: assets.filter((a: any) => a.url), // Only return assets with URLs
      liveInsights: request.liveInsights || [],
      qualityScore: request.qualityScore || null,
      deliveryUrl: request.deliveryUrl,
      errorMessage: request.errorMessage,
      createdAt: request.createdAt,
      startedAt: request.startedAt,
      completedAt: request.completedAt,
      deliveredAt: request.deliveredAt,
    });
  } catch (error: any) {
    console.error("[WEBHOOK] Status check error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blitz status" },
      { status: 500 }
    );
  }
}
