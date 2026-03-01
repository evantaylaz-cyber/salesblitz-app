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
 * Priority: sprint/pack runs first, then subscription runs.
 * Returns success/failure with source info.
 */
export async function consumeRun(
  userId: string,
  toolName: ToolName
): Promise<RunResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      runPacks: {
        where: {
          runsRemaining: { gt: 0 },
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: "asc" }, // use soonest-expiring first
      },
    },
  });

  if (!user) return { success: false, error: "User not found" };

  const tool = TOOLS.find((t) => t.id === toolName);
  if (!tool) return { success: false, error: "Unknown tool" };

  // Check tier-based access (subscription or sprint)
  const hasSubscriptionAccess =
    user.subscriptionStatus === "active" &&
    canAccessTool(user.currentTier, tool.minimumTier);

  // Check pack/sprint access
  const eligiblePacks = user.runPacks.filter((pack) => {
    if (pack.allowedTools.length === 0) {
      // Regular pack — user needs subscription-level access to the tool
      return hasSubscriptionAccess;
    }
    // Sprint pack — check if this tool is in the allowed list
    return pack.allowedTools.includes(toolName);
  });

  // Try to consume from packs/sprints first
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

  // Try subscription runs
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
    error: "No runs remaining. Purchase a run pack or upgrade your plan.",
  };
}

/**
 * Get the total available runs for a user across all sources for a specific tool.
 */
export async function getAvailableRuns(
  userId: string,
  toolName?: ToolName
): Promise<{
  subscriptionRuns: number;
  packRuns: number;
  sprintRuns: number;
  total: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      runPacks: {
        where: {
          runsRemaining: { gt: 0 },
          expiresAt: { gt: new Date() },
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
