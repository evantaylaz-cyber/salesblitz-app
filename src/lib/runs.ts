import prisma from "./db";
import { canAccessTool, TOOLS, ToolName } from "./tools";

interface RunResult {
  success: boolean;
  error?: string;
  source?: string;
  runsRemaining?: number;
}

/**
 * Attempt to consume a run for a given tool.
 * If teamId is provided, consume from team's pool. Otherwise personal.
 * Priority: sprint/pack runs first, then subscription runs.
 */
export async function consumeRun(
  userId: string,
  toolName: ToolName,
  teamId?: string | null
): Promise<RunResult> {
  // Team run consumption
  if (teamId) {
    return consumeTeamRun(userId, teamId, toolName);
  }

  // Personal run consumption (existing logic)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      runPacks: {
        where: {
          runsRemaining: { gt: 0 },
          expiresAt: { gt: new Date() },
          teamId: null, // personal packs only
        },
        orderBy: { expiresAt: "asc" },
      },
    },
  });

  if (!user) return { success: false, error: "User not found" };

  const tool = TOOLS.find((t) => t.id === toolName);
  if (!tool) return { success: false, error: "Unknown tool" };

  const hasSubscriptionAccess =
    user.subscriptionStatus === "active" &&
    canAccessTool(user.currentTier, tool.minimumTier);

  const eligiblePacks = user.runPacks.filter((pack: any) => {
    if (pack.allowedTools.length === 0) {
      return hasSubscriptionAccess;
    }
    return pack.allowedTools.includes(toolName);
  });

  // Try packs first
  if (eligiblePacks.length > 0) {
    const pack = eligiblePacks[0];
    await prisma.runPack.update({
      where: { id: pack.id },
      data: { runsRemaining: pack.runsRemaining - 1 },
    });

    await prisma.runLog.create({
      data: {
        userId,
        toolName,
        source: pack.type === "interview_sprint" ? "sprint" : "pack",
        status: "completed",
        priority: user.priorityProcessing,
      },
    });

    return {
      success: true,
      source: pack.type === "interview_sprint" ? "sprint" : "pack",
      runsRemaining: pack.runsRemaining - 1,
    };
  }

  // Try subscription
  if (hasSubscriptionAccess && user.subscriptionRunsRemaining > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionRunsRemaining: user.subscriptionRunsRemaining - 1 },
    });

    await prisma.runLog.create({
      data: {
        userId,
        toolName,
        source: "subscription",
        status: "completed",
        priority: user.priorityProcessing,
      },
    });

    return {
      success: true,
      source: "subscription",
      runsRemaining: user.subscriptionRunsRemaining - 1,
    };
  }

  return {
    success: false,
    error: "No blitzes remaining. Purchase a blitz pack or upgrade your plan.",
  };
}

/**
 * Consume a run from a team's pool.
 * Verifies user is an active member of the team.
 */
async function consumeTeamRun(
  userId: string,
  teamId: string,
  toolName: ToolName
): Promise<RunResult> {
  // Verify team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
      inviteStatus: "accepted",
    },
  });

  if (!membership) {
    return { success: false, error: "Not a member of this team" };
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      runPacks: {
        where: {
          runsRemaining: { gt: 0 },
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: "asc" },
      },
    },
  });

  if (!team) return { success: false, error: "Team not found" };

  const tool = TOOLS.find((t) => t.id === toolName);
  if (!tool) return { success: false, error: "Unknown tool" };

  const hasSubscriptionAccess =
    team.subscriptionStatus === "active" &&
    canAccessTool(team.currentTier, tool.minimumTier);

  // Try team packs first
  const eligiblePacks = team.runPacks.filter((pack: any) => {
    if (pack.allowedTools.length === 0) return hasSubscriptionAccess;
    return pack.allowedTools.includes(toolName);
  });

  if (eligiblePacks.length > 0) {
    const pack = eligiblePacks[0];
    await prisma.runPack.update({
      where: { id: pack.id },
      data: { runsRemaining: pack.runsRemaining - 1 },
    });

    await prisma.runLog.create({
      data: {
        userId,
        teamId,
        toolName,
        source: pack.type === "interview_sprint" ? "sprint" : "pack",
        status: "completed",
        priority: false,
      },
    });

    return {
      success: true,
      source: `team_${pack.type === "interview_sprint" ? "sprint" : "pack"}`,
      runsRemaining: pack.runsRemaining - 1,
    };
  }

  // Try team subscription
  if (hasSubscriptionAccess && team.subscriptionRunsRemaining > 0) {
    await prisma.team.update({
      where: { id: teamId },
      data: { subscriptionRunsRemaining: team.subscriptionRunsRemaining - 1 },
    });

    await prisma.runLog.create({
      data: {
        userId,
        teamId,
        toolName,
        source: "team_subscription",
        status: "completed",
        priority: false,
      },
    });

    return {
      success: true,
      source: "team_subscription",
      runsRemaining: team.subscriptionRunsRemaining - 1,
    };
  }

  return {
    success: false,
    error: "Team has no blitzes remaining. The team admin needs to upgrade or purchase a blitz pack.",
  };
}

/**
 * Get total available runs for a user (personal) or team.
 */
export async function getAvailableRuns(
  userId: string,
  toolName?: ToolName,
  teamId?: string | null
): Promise<{
  subscriptionRuns: number;
  packRuns: number;
  sprintRuns: number;
  total: number;
}> {
  if (teamId) {
    return getTeamAvailableRuns(teamId, toolName);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      runPacks: {
        where: {
          runsRemaining: { gt: 0 },
          expiresAt: { gt: new Date() },
          teamId: null,
        },
      },
    },
  });

  if (!user) return { subscriptionRuns: 0, packRuns: 0, sprintRuns: 0, total: 0 };

  const subscriptionRuns =
    user.subscriptionStatus === "active" ? user.subscriptionRunsRemaining : 0;

  let packRuns = 0;
  let sprintRuns = 0;

  for (const pack of user.runPacks) {
    if (pack.type === "interview_sprint") {
      if (!toolName || ["interview_outreach", "interview_prep"].includes(toolName)) {
        sprintRuns += pack.runsRemaining;
      }
    } else {
      packRuns += pack.runsRemaining;
    }
  }

  return {
    subscriptionRuns,
    packRuns,
    sprintRuns,
    total: subscriptionRuns + packRuns + sprintRuns,
  };
}

async function getTeamAvailableRuns(
  teamId: string,
  toolName?: ToolName
): Promise<{
  subscriptionRuns: number;
  packRuns: number;
  sprintRuns: number;
  total: number;
}> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      runPacks: {
        where: {
          runsRemaining: { gt: 0 },
          expiresAt: { gt: new Date() },
        },
      },
    },
  });

  if (!team) return { subscriptionRuns: 0, packRuns: 0, sprintRuns: 0, total: 0 };

  const subscriptionRuns =
    team.subscriptionStatus === "active" ? team.subscriptionRunsRemaining : 0;

  let packRuns = 0;
  let sprintRuns = 0;

  for (const pack of team.runPacks) {
    if (pack.type === "interview_sprint") {
      if (!toolName || ["interview_outreach", "interview_prep"].includes(toolName)) {
        sprintRuns += pack.runsRemaining;
      }
    } else {
      packRuns += pack.runsRemaining;
    }
  }

  return {
    subscriptionRuns,
    packRuns,
    sprintRuns,
    total: subscriptionRuns + packRuns + sprintRuns,
  };
}
