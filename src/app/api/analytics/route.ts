import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET /api/analytics?teamId=xxx&range=30
// Returns usage analytics for individual or team
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const rangeDays = parseInt(searchParams.get("range") || "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - rangeDays);

    // If team analytics, verify membership
    if (teamId) {
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: user.id,
          inviteStatus: "accepted",
        },
      });
      if (!membership) {
        return NextResponse.json({ error: "Not a team member" }, { status: 403 });
      }
    }

    // Build the where clause
    const runLogWhere = teamId
      ? { teamId, createdAt: { gte: since } }
      : { userId: user.id, teamId: null, createdAt: { gte: since } };

    const requestWhere = teamId
      ? { teamId, createdAt: { gte: since } }
      : { userId: user.id, teamId: null, createdAt: { gte: since } };

    // 1. Total runs in period
    const totalRuns = await prisma.runLog.count({ where: runLogWhere });

    // 2. Runs by tool
    const runsByTool = await prisma.runLog.groupBy({
      by: ["toolName"],
      where: runLogWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // 3. Runs by status
    const runsByStatus = await prisma.runLog.groupBy({
      by: ["status"],
      where: runLogWhere,
      _count: { id: true },
    });

    // 4. Runs by day (for chart)
    const allRunLogs = await prisma.runLog.findMany({
      where: runLogWhere,
      select: { createdAt: true, toolName: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date string
    const dailyMap: Record<string, number> = {};
    for (const log of allRunLogs) {
      const day = log.createdAt.toISOString().split("T")[0];
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }
    const dailyRuns = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    // 5. Recent requests (last 10)
    const recentRequests = await prisma.runRequest.findMany({
      where: requestWhere,
      select: {
        id: true,
        toolName: true,
        status: true,
        targetName: true,
        targetCompany: true,
        createdAt: true,
        completedAt: true,
        priority: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // 6. Average completion time (for delivered requests)
    const deliveredRequests = await prisma.runRequest.findMany({
      where: {
        ...requestWhere,
        status: "delivered",
        completedAt: { not: null },
      },
      select: { createdAt: true, completedAt: true },
    });

    let avgCompletionMinutes: number | null = null;
    if (deliveredRequests.length > 0) {
      const totalMs = deliveredRequests.reduce((sum, r) => {
        const diff = r.completedAt!.getTime() - r.createdAt.getTime();
        return sum + diff;
      }, 0);
      avgCompletionMinutes = Math.round(totalMs / deliveredRequests.length / 60000);
    }

    // 7. Top target companies
    const topCompanies = await prisma.runRequest.groupBy({
      by: ["targetCompany"],
      where: requestWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    // 8. Team member breakdown (if team)
    let memberBreakdown: { name: string; email: string; runCount: number }[] = [];
    if (teamId) {
      const teamLogs = await prisma.runLog.findMany({
        where: { teamId, createdAt: { gte: since } },
        select: {
          userId: true,
          user: { select: { name: true, email: true } },
        },
      });
      const memberMap: Record<string, { name: string; email: string; count: number }> = {};
      for (const log of teamLogs) {
        if (!memberMap[log.userId]) {
          memberMap[log.userId] = {
            name: log.user.name || "Unknown",
            email: log.user.email,
            count: 0,
          };
        }
        memberMap[log.userId].count++;
      }
      memberBreakdown = Object.values(memberMap)
        .map((m) => ({ name: m.name, email: m.email, runCount: m.count }))
        .sort((a, b) => b.runCount - a.runCount);
    }

    return NextResponse.json({
      range: rangeDays,
      totalRuns,
      avgCompletionMinutes,
      runsByTool: runsByTool.map((r) => ({ tool: r.toolName, count: r._count.id })),
      runsByStatus: runsByStatus.map((r) => ({ status: r.status, count: r._count.id })),
      dailyRuns,
      topCompanies: topCompanies.map((c) => ({ company: c.targetCompany, count: c._count.id })),
      recentRequests: recentRequests.map((r) => ({
        id: r.id,
        tool: r.toolName,
        status: r.status,
        target: `${r.targetName} @ ${r.targetCompany}`,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        priority: r.priority,
        userName: r.user.name || r.user.email,
      })),
      memberBreakdown,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
