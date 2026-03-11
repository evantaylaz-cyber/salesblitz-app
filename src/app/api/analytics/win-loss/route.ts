import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ObjectionPattern {
  objection: string;
  count: number;
  effectiveness: Record<string, number>; // strong: 2, weak: 1, etc.
}

interface DimensionScore {
  dimension: string;
  wonAvg: number | null;
  lostAvg: number | null;
  delta: number | null;
}

interface WinLossAnalytics {
  // Summary
  totalTargets: number;
  wonCount: number;
  lostCount: number;
  activeCount: number;
  winRate: number | null; // null if no closed deals

  // Patterns: won vs lost
  avgRoundsWon: number | null;
  avgRoundsLost: number | null;
  toolBreakdown: Array<{
    tool: string;
    wonCount: number;
    lostCount: number;
    winRate: number | null;
  }>;

  // Meeting type performance
  meetingTypeBreakdown: Array<{
    type: string;
    wonCount: number;
    lostCount: number;
    avgScore: number | null;
  }>;

  // Objection patterns (from recordings)
  topObjectionsLost: ObjectionPattern[];
  topObjectionsWon: ObjectionPattern[];

  // Deal qualification gaps (from recordings)
  topGapsLost: Array<{ gap: string; count: number }>;
  topStrengthsWon: Array<{ strength: string; count: number }>;

  // Messaging dimension analysis (from practice sessions)
  dimensionScores: DimensionScore[];

  // Coaching patterns
  topCoachingThemes: Array<{
    dimension: string;
    observation: string;
    targetCompany: string;
    outcome: string;
  }>;

  // Timeline: recent wins & losses
  recentOutcomes: Array<{
    targetId: string;
    companyName: string;
    status: string;
    roundCount: number;
    blitzCount: number;
    updatedAt: string;
  }>;
}

// ─── GET /api/analytics/win-loss ─────────────────────────────────────────────

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

    // ─── Fetch all user's targets with relationships ─────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targets: any[] = await prisma.target.findMany({
      where: { userId: user.id },
      include: {
        runRequests: {
          select: {
            id: true,
            toolName: true,
            status: true,
            meetingType: true,
          },
        },
        practiceSessions: {
          where: { status: "completed" },
          select: {
            id: true,
            cotmScore: true,
            outcome: true,
          },
        },
        meetingRecordings: {
          where: { status: "completed" },
          select: {
            id: true,
            meetingType: true,
            analysis: true,
            outcome: true,
            overallScore: true,
          },
        },
      },
    });

    // ─── Summary stats ───────────────────────────────────────────────
    const wonTargets = targets.filter((t) => t.status === "won");
    const lostTargets = targets.filter((t) => t.status === "lost");
    const activeTargets = targets.filter(
      (t) => t.status === "active" || t.status === "paused"
    );
    const closedCount = wonTargets.length + lostTargets.length;

    const analytics: WinLossAnalytics = {
      totalTargets: targets.length,
      wonCount: wonTargets.length,
      lostCount: lostTargets.length,
      activeCount: activeTargets.length,
      winRate: closedCount > 0 ? wonTargets.length / closedCount : null,

      avgRoundsWon:
        wonTargets.length > 0
          ? wonTargets.reduce((s, t) => s + t.roundCount, 0) /
            wonTargets.length
          : null,
      avgRoundsLost:
        lostTargets.length > 0
          ? lostTargets.reduce((s, t) => s + t.roundCount, 0) /
            lostTargets.length
          : null,

      toolBreakdown: [],
      meetingTypeBreakdown: [],
      topObjectionsLost: [],
      topObjectionsWon: [],
      topGapsLost: [],
      topStrengthsWon: [],
      dimensionScores: [],
      topCoachingThemes: [],
      recentOutcomes: [],
    };

    // ─── Tool breakdown by outcome ───────────────────────────────────
    const toolMap: Record<
      string,
      { won: number; lost: number }
    > = {};
    for (const target of targets) {
      if (target.status !== "won" && target.status !== "lost") continue;
      for (const req of target.runRequests) {
        if (!toolMap[req.toolName]) toolMap[req.toolName] = { won: 0, lost: 0 };
        if (target.status === "won") toolMap[req.toolName].won++;
        else toolMap[req.toolName].lost++;
      }
    }
    analytics.toolBreakdown = Object.entries(toolMap)
      .map(([tool, counts]) => ({
        tool,
        wonCount: counts.won,
        lostCount: counts.lost,
        winRate:
          counts.won + counts.lost > 0
            ? counts.won / (counts.won + counts.lost)
            : null,
      }))
      .sort(
        (a, b) => b.wonCount + b.lostCount - (a.wonCount + a.lostCount)
      );

    // ─── Meeting type breakdown ──────────────────────────────────────
    const mtMap: Record<
      string,
      { won: number; lost: number; scores: number[] }
    > = {};
    for (const target of targets) {
      if (target.status !== "won" && target.status !== "lost") continue;
      for (const rec of target.meetingRecordings) {
        const mt = rec.meetingType || "other";
        if (!mtMap[mt]) mtMap[mt] = { won: 0, lost: 0, scores: [] };
        if (target.status === "won") mtMap[mt].won++;
        else mtMap[mt].lost++;
        if (rec.overallScore != null) mtMap[mt].scores.push(rec.overallScore);
      }
    }
    analytics.meetingTypeBreakdown = Object.entries(mtMap)
      .map(([type, data]) => ({
        type,
        wonCount: data.won,
        lostCount: data.lost,
        avgScore:
          data.scores.length > 0
            ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
            : null,
      }))
      .sort(
        (a, b) => b.wonCount + b.lostCount - (a.wonCount + a.lostCount)
      );

    // ─── Objection patterns from recordings ──────────────────────────
    const objMapLost: Record<
      string,
      { count: number; effectiveness: Record<string, number> }
    > = {};
    const objMapWon: Record<
      string,
      { count: number; effectiveness: Record<string, number> }
    > = {};

    for (const target of targets) {
      if (target.status !== "won" && target.status !== "lost") continue;
      const objMap = target.status === "lost" ? objMapLost : objMapWon;

      for (const rec of target.meetingRecordings) {
        const analysis = rec.analysis as Record<string, unknown> | null;
        if (!analysis) continue;
        const objections = analysis.objections as Array<{
          objection: string;
          effectiveness?: string;
        }> | undefined;
        if (!Array.isArray(objections)) continue;

        for (const obj of objections) {
          const key = obj.objection?.toLowerCase().trim();
          if (!key) continue;
          if (!objMap[key]) objMap[key] = { count: 0, effectiveness: {} };
          objMap[key].count++;
          const eff = obj.effectiveness || "unknown";
          objMap[key].effectiveness[eff] =
            (objMap[key].effectiveness[eff] || 0) + 1;
        }
      }
    }

    analytics.topObjectionsLost = Object.entries(objMapLost)
      .map(([objection, data]) => ({
        objection,
        count: data.count,
        effectiveness: data.effectiveness,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    analytics.topObjectionsWon = Object.entries(objMapWon)
      .map(([objection, data]) => ({
        objection,
        count: data.count,
        effectiveness: data.effectiveness,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ─── Deal qualification gaps & strengths ─────────────────────────
    const gapCount: Record<string, number> = {};
    const strengthCount: Record<string, number> = {};

    for (const target of targets) {
      if (target.status !== "won" && target.status !== "lost") continue;
      for (const rec of target.meetingRecordings) {
        const analysis = rec.analysis as Record<string, unknown> | null;
        if (!analysis) continue;
        const dq = analysis.dealQualification as {
          gaps?: string[];
          strengths?: string[];
        } | undefined;
        if (!dq) continue;

        if (target.status === "lost" && Array.isArray(dq.gaps)) {
          for (const gap of dq.gaps) {
            const key = gap.toLowerCase().trim();
            gapCount[key] = (gapCount[key] || 0) + 1;
          }
        }
        if (target.status === "won" && Array.isArray(dq.strengths)) {
          for (const str of dq.strengths) {
            const key = str.toLowerCase().trim();
            strengthCount[key] = (strengthCount[key] || 0) + 1;
          }
        }
      }
    }

    analytics.topGapsLost = Object.entries(gapCount)
      .map(([gap, count]) => ({ gap, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    analytics.topStrengthsWon = Object.entries(strengthCount)
      .map(([strength, count]) => ({ strength, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ─── Messaging dimension scores: won vs lost ─────────────────────
    const dimensions = [
      "overall",
      "beforeState",
      "negativeConsequences",
      "requiredCapabilities",
      "pbos",
      "howWeDoIt",
    ];
    const dimScoresWon: Record<string, number[]> = {};
    const dimScoresLost: Record<string, number[]> = {};
    for (const dim of dimensions) {
      dimScoresWon[dim] = [];
      dimScoresLost[dim] = [];
    }

    for (const target of targets) {
      if (target.status !== "won" && target.status !== "lost") continue;
      const bucket =
        target.status === "won" ? dimScoresWon : dimScoresLost;

      for (const session of target.practiceSessions) {
        const scores = session.cotmScore as Record<string, number> | null;
        if (!scores) continue;
        for (const dim of dimensions) {
          if (typeof scores[dim] === "number") {
            bucket[dim].push(scores[dim]);
          }
        }
      }
    }

    analytics.dimensionScores = dimensions.map((dim) => {
      const wonArr = dimScoresWon[dim];
      const lostArr = dimScoresLost[dim];
      const wonAvg =
        wonArr.length > 0
          ? wonArr.reduce((a, b) => a + b, 0) / wonArr.length
          : null;
      const lostAvg =
        lostArr.length > 0
          ? lostArr.reduce((a, b) => a + b, 0) / lostArr.length
          : null;
      return {
        dimension: dim,
        wonAvg: wonAvg !== null ? Math.round(wonAvg * 10) / 10 : null,
        lostAvg: lostAvg !== null ? Math.round(lostAvg * 10) / 10 : null,
        delta:
          wonAvg !== null && lostAvg !== null
            ? Math.round((wonAvg - lostAvg) * 10) / 10
            : null,
      };
    });

    // ─── Coaching themes from recordings ─────────────────────────────
    const coachingEntries: Array<{
      dimension: string;
      observation: string;
      targetCompany: string;
      outcome: string;
    }> = [];

    for (const target of targets) {
      if (target.status !== "won" && target.status !== "lost") continue;
      for (const rec of target.meetingRecordings) {
        const analysis = rec.analysis as Record<string, unknown> | null;
        if (!analysis) continue;
        const notes = analysis.coachingNotes as Array<{
          dimension: string;
          observation: string;
        }> | undefined;
        if (!Array.isArray(notes)) continue;

        for (const note of notes) {
          coachingEntries.push({
            dimension: note.dimension,
            observation: note.observation,
            targetCompany: target.companyName,
            outcome: target.status,
          });
        }
      }
    }

    // Surface the most recent/relevant coaching themes
    analytics.topCoachingThemes = coachingEntries.slice(0, 15);

    // ─── Recent outcomes timeline ────────────────────────────────────
    analytics.recentOutcomes = targets
      .filter((t) => t.status === "won" || t.status === "lost")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 10)
      .map((t) => ({
        targetId: t.id,
        companyName: t.companyName,
        status: t.status,
        roundCount: t.roundCount,
        blitzCount: t.runRequests.length,
        updatedAt: t.updatedAt.toISOString(),
      }));

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Win/Loss analytics error:", error);
    return NextResponse.json(
      { error: "Failed to load win/loss analytics" },
      { status: 500 }
    );
  }
}
