import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { consumeRun } from "@/lib/runs";
import { ToolName } from "@/lib/tools";
import { sendOrderNotification } from "@/lib/email";
import { initializeSteps, getExpectedAssets } from "@/lib/job-steps";
import { normalizeAssets } from "@/lib/normalize-assets";

// GET — list current user's run requests
export async function GET() {
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

    // Get user's team memberships for team-scoped queries
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: user.id, inviteStatus: "accepted" },
      select: { teamId: true },
    });
    const teamIds = teamMemberships.map((m) => m.teamId);

    const requests = await prisma.runRequest.findMany({
      where: {
        OR: [
          { userId: user.id, teamId: null }, // personal
          ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Normalize assets for each request so the UI gets consistent array format
    const normalized = requests.map((r) => ({
      ...r,
      assets: normalizeAssets(r.assets, r.toolName),
    }));

    return NextResponse.json({ requests: normalized });
  } catch (error) {
    console.error("Fetch requests error:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST — submit a new run request (consumes a run, initializes execution steps)
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      toolName,
      targetName,
      targetCompany,
      targetRole,
      targetCompanyUrl,
      jobDescription,
      linkedinUrl,
      linkedinText,
      additionalNotes,
      engagementType,
      meetingDate,
      priorInteractions,
      teamId,
    } = body;

    if (!toolName || !targetName || !targetCompany) {
      return NextResponse.json(
        { error: "toolName, targetName, and targetCompany are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If teamId provided, verify user is an active member
    if (teamId) {
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: user.id,
          inviteStatus: "accepted",
        },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "Not a member of this team" },
          { status: 403 }
        );
      }
    }

    // Consume a run first — if they don't have runs, fail early
    const runResult = await consumeRun(user.id, toolName as ToolName, teamId || null);
    if (!runResult.success) {
      return NextResponse.json({ error: runResult.error }, { status: 403 });
    }

    // Initialize execution steps and expected assets for this tool
    const steps = initializeSteps(toolName as ToolName);
    const expectedAssets = getExpectedAssets(toolName as ToolName);

    // Create the run request with execution tracking
    const request = await prisma.runRequest.create({
      data: {
        userId: user.id,
        teamId: teamId || null,
        toolName,
        targetName,
        targetCompany,
        targetRole: targetRole || null,
        jobDescription: jobDescription || null,
        linkedinUrl: linkedinUrl || null,
        linkedinText: linkedinText || null,
        additionalNotes: additionalNotes || null,
        targetCompanyUrl: targetCompanyUrl || null,
        engagementType: engagementType || 'cold_outreach',
        meetingDate: meetingDate || null,
        priorInteractions: priorInteractions || null,
        priority: teamId ? false : user.priorityProcessing,
        status: "submitted",
        steps: JSON.parse(JSON.stringify(steps)),
        assets: JSON.parse(JSON.stringify(expectedAssets.map(a => ({ ...a, url: null, size: null })))),
        currentStep: null,
      },
    });

    // Send email notification (don't block response on failure)
    sendOrderNotification({
      requestId: request.id,
      toolName,
      targetName,
      targetCompany,
      targetRole,
      jobDescription,
      linkedinUrl,
      additionalNotes,
      priority: user.priorityProcessing,
      customerEmail: clerkUser.emailAddresses?.[0]?.emailAddress || null,
      customerName: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
    }).catch((err) => console.error("Order notification failed:", err));

    // Trigger the execution engine (MUST await — unawaited fetch dies on Vercel serverless)
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
        console.log("Worker trigger response:", workerRes.status, "for request:", request.id);
      } catch (err) {
        console.error("Worker trigger failed:", err);
      }
    } else {
      console.warn("WORKER_WEBHOOK_URL not set — skipping worker trigger");
    }

    return NextResponse.json({
      success: true,
      requestId: request.id,
      source: runResult.source,
      runsRemaining: runResult.runsRemaining,
      steps,
    });
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}
