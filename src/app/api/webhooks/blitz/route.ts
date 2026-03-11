import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { validateApiKey, checkApiKeyRateLimit } from "@/lib/api-keys";
import { consumeRun } from "@/lib/runs";
import { ToolName, TOOLS } from "@/lib/tools";
import { initializeSteps, getExpectedAssets } from "@/lib/job-steps";
import { triggerWorker } from "@/lib/trigger-worker";

const VALID_TOOLS = new Set(
  TOOLS.filter((t) => !t.comingSoon && t.id !== "practice_mode").map((t) => t.id)
);

/**
 * POST /api/webhooks/blitz — Trigger a blitz via API key auth.
 * Designed for n8n workflows, CRM integrations, and agency automation.
 *
 * Headers:
 *   Authorization: Bearer sb_live_<key>
 *
 * Body:
 *   {
 *     toolName: string (required),
 *     targetCompany: string (required),
 *     targetName?: string,
 *     targetRole?: string,
 *     targetCompanyUrl?: string,
 *     linkedinUrl?: string,
 *     additionalNotes?: string,
 *     meetingType?: string,
 *     engagementType?: string,
 *     callbackUrl?: string  // URL to POST results to on completion
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     requestId: string,
 *     statusUrl: string,    // Polling URL to check progress
 *     runsRemaining: number
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth: API key validation ──
    const authHeader = req.headers.get("authorization");
    const apiKey = await validateApiKey(authHeader);

    if (!apiKey) {
      return NextResponse.json(
        { error: "Invalid or missing API key. Include: Authorization: Bearer sb_live_<key>" },
        { status: 401 }
      );
    }

    // Check scopes
    const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes : [];
    if (!scopes.includes("blitz:create")) {
      return NextResponse.json(
        { error: "API key does not have blitz:create scope" },
        { status: 403 }
      );
    }

    // ── Rate limiting ──
    if (!checkApiKeyRateLimit(apiKey.id, apiKey.rateLimit)) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Max ${apiKey.rateLimit} requests per hour.` },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    // ── Parse & validate body ──
    const body = await req.json();
    const {
      toolName,
      targetCompany,
      targetName,
      targetRole,
      targetCompanyUrl,
      linkedinUrl,
      linkedinText,
      additionalNotes,
      meetingType,
      engagementType,
      jobDescription,
      caseStudies,
      callbackUrl,
    } = body;

    if (!toolName || !targetCompany) {
      return NextResponse.json(
        { error: "toolName and targetCompany are required" },
        { status: 400 }
      );
    }

    if (!VALID_TOOLS.has(toolName)) {
      return NextResponse.json(
        { error: `Invalid toolName. Valid options: ${[...VALID_TOOLS].join(", ")}` },
        { status: 400 }
      );
    }

    // Validate callbackUrl if provided
    if (callbackUrl) {
      try {
        const url = new URL(callbackUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          return NextResponse.json(
            { error: "callbackUrl must use http or https" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "callbackUrl is not a valid URL" },
          { status: 400 }
        );
      }
    }

    const user = apiKey.user;
    const teamId = apiKey.teamId || null;

    // If key is team-scoped, verify team membership
    if (teamId) {
      const membership = await prisma.teamMember.findFirst({
        where: { teamId, userId: user.id, inviteStatus: "accepted" },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "API key is scoped to a team you are not a member of" },
          { status: 403 }
        );
      }
    }

    // ── Consume a run ──
    const runResult = await consumeRun(user.id, toolName as ToolName, teamId);
    if (!runResult.success) {
      return NextResponse.json({ error: runResult.error }, { status: 403 });
    }

    // ── Initialize execution ──
    const steps = initializeSteps(toolName as ToolName);
    const expectedAssets = getExpectedAssets(toolName as ToolName);

    // Infer engagement type
    const inferredEngagement = engagementType || (
      toolName.startsWith("interview_") ? "interview" :
      meetingType === "discovery" ? "cold_outreach" :
      meetingType === "follow_up" ? "follow_up" :
      meetingType === "closing" ? "closing_call" :
      "cold_outreach"
    );

    // Upsert Target
    const targetType = toolName.startsWith("interview_") ? "interview" : "prospect";
    const target = await prisma.target.upsert({
      where: {
        userId_companyName_contactName: {
          userId: user.id,
          companyName: targetCompany,
          contactName: targetName || "",
        },
      },
      update: {
        contactTitle: targetRole || undefined,
        roundCount: { increment: 1 },
        currentRound: { increment: 1 },
      },
      create: {
        userId: user.id,
        companyName: targetCompany,
        contactName: targetName || "",
        contactTitle: targetRole || null,
        type: targetType,
        roundCount: 1,
        currentRound: 1,
      },
    });

    // ── Create RunRequest ──
    const request = await prisma.runRequest.create({
      data: {
        userId: user.id,
        teamId,
        toolName,
        targetId: target.id,
        targetName: targetName || "",
        targetCompany,
        targetRole: targetRole || null,
        jobDescription: jobDescription || null,
        linkedinUrl: linkedinUrl || null,
        linkedinText: linkedinText || null,
        additionalNotes: additionalNotes || null,
        targetCompanyUrl: targetCompanyUrl || null,
        meetingType: meetingType || null,
        engagementType: inferredEngagement,
        caseStudies: caseStudies || null,
        callbackUrl: callbackUrl || null,
        callbackStatus: callbackUrl ? "pending" : null,
        priority: teamId ? false : user.priorityProcessing,
        status: "submitted",
        steps: JSON.parse(JSON.stringify(steps)),
        assets: JSON.parse(JSON.stringify(expectedAssets.map((a: any) => ({ ...a, url: null, size: null })))),
        currentStep: null,
      },
    });

    // ── Trigger worker ──
    const workerResult = await triggerWorker({ requestId: request.id });
    if (!workerResult.success) {
      console.error(
        `[WEBHOOK] Worker trigger failed for request ${request.id}: ${workerResult.error}`
      );
    }

    // Build the status URL (relative, caller knows the base domain)
    const baseUrl = req.headers.get("x-forwarded-host") || req.headers.get("host") || "salesblitz.ai";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const statusUrl = `${protocol}://${baseUrl}/api/webhooks/blitz/${request.id}`;

    return NextResponse.json({
      success: true,
      requestId: request.id,
      statusUrl,
      source: runResult.source,
      runsRemaining: runResult.runsRemaining,
    });
  } catch (error: any) {
    console.error("[WEBHOOK] Create blitz error:", error);
    return NextResponse.json(
      { error: "Failed to create blitz request" },
      { status: 500 }
    );
  }
}
