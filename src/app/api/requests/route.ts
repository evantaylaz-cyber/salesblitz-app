import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { consumeRun } from "@/lib/runs";
import { ToolName, TOOLS } from "@/lib/tools";
import { sendOrderNotification } from "@/lib/email";
import { initializeSteps, getExpectedAssets } from "@/lib/job-steps";
import { normalizeAssets } from "@/lib/normalize-assets";
import { triggerWorker } from "@/lib/trigger-worker";

// Infer engagement type from tool + meeting context when user doesn't specify
function inferEngagementType(toolName: string, meetingType?: string): string {
  if (toolName?.startsWith("interview_")) return "interview";
  if (meetingType === "discovery") return "cold_outreach";
  if (meetingType === "follow_up") return "follow_up";
  if (meetingType === "closing") return "closing_call";
  if (meetingType === "pitch") return "cold_outreach";
  return "cold_outreach";
}

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
      meetingType,
      engagementType,
      meetingDate,
      priorInteractions,
      caseStudies,
      interviewInstructions,
      teamId,
      // Panel composition (interview_prep only)
      panel,
    } = body;

    if (!toolName || !targetName || !targetCompany) {
      return NextResponse.json(
        { error: "toolName, targetName, and targetCompany are required" },
        { status: 400 }
      );
    }

    // Block comingSoon tools from being submitted
    const toolDef = TOOLS.find((t) => t.id === toolName);
    if (toolDef?.comingSoon) {
      return NextResponse.json(
        { error: "This tool is coming soon and not yet available." },
        { status: 400 }
      );
    }

    // Practice mode uses the live practice pipeline, not the blitz worker
    if (toolName === "practice_mode") {
      return NextResponse.json(
        { error: "Practice mode sessions are started from /practice, not submitted as blitz requests." },
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

    // Upsert Target entity (groups all activity per user per company/contact pair)
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

    // Create the run request with execution tracking
    const request = await prisma.runRequest.create({
      data: {
        userId: user.id,
        teamId: teamId || null,
        toolName,
        targetId: target.id,
        targetName,
        targetCompany,
        targetRole: targetRole || null,
        jobDescription: jobDescription || null,
        linkedinUrl: linkedinUrl || null,
        linkedinText: linkedinText || null,
        additionalNotes: additionalNotes || null,
        targetCompanyUrl: targetCompanyUrl || null,
        meetingType: meetingType || null,
        engagementType: engagementType || inferEngagementType(toolName, meetingType),
        meetingDate: meetingDate || null,
        priorInteractions: priorInteractions || null,
        caseStudies: caseStudies || null,
        interviewInstructions: interviewInstructions || null,
        priority: teamId ? false : user.priorityProcessing,
        status: "submitted",
        steps: JSON.parse(JSON.stringify(steps)),
        assets: JSON.parse(JSON.stringify(expectedAssets.map(a => ({ ...a, url: null, size: null })))),
        currentStep: null,
      },
    });

    // Create InterviewPanel + members if panel data provided (interview_prep only)
    if (panel && toolName === "interview_prep" && Array.isArray(panel.members) && panel.members.length > 0) {
      await prisma.interviewPanel.create({
        data: {
          runRequestId: request.id,
          roundType: panel.roundType || meetingType || "panel",
          roundNumber: panel.roundNumber || 1,
          assignment: interviewInstructions || null,
          members: {
            create: panel.members.map((m: { name: string; title?: string; roleInMeeting: string; personalityVibe?: string; evaluationFocus?: string; linkedinUrl?: string }, idx: number) => ({
              name: m.name,
              title: m.title || null,
              roleInMeeting: m.roleInMeeting,
              personalityVibe: m.personalityVibe || null,
              evaluationFocus: m.evaluationFocus || null,
              linkedinUrl: m.linkedinUrl || null,
              order: idx,
            })),
          },
        },
      });
    }

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
      caseStudies,
      priority: user.priorityProcessing,
      customerEmail: clerkUser.emailAddresses?.[0]?.emailAddress || null,
      customerName: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
    }).catch((err) => console.error("Order notification failed:", err));

    // Trigger the execution engine with retry (MUST await — unawaited fetch dies on Vercel serverless)
    const workerResult = await triggerWorker({ requestId: request.id });
    if (!workerResult.success) {
      console.error(
        `Worker trigger failed after ${workerResult.attempt} attempts for request ${request.id}: ${workerResult.error}`
      );
      // Don't fail the API response — stale-run recovery will catch it
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
