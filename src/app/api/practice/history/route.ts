import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET /api/practice/history
// Returns the user's practice session history with scores
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
    const company = searchParams.get("company");
    const limit = parseInt(searchParams.get("limit") || "20");

    const sessions = await prisma.practiceSession.findMany({
      where: {
        userId: user.id,
        ...(company ? { targetCompany: { contains: company, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
      select: {
        id: true,
        targetCompany: true,
        targetRole: true,
        personaName: true,
        durationSeconds: true,
        cotmScore: true,
        feedback: true,
        outcome: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // Get monthly usage for cap display
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCount = await prisma.practiceSession.count({
      where: {
        userId: user.id,
        createdAt: { gte: monthStart },
        status: { in: ["active", "completed"] },
      },
    });

    return NextResponse.json({
      sessions,
      usage: {
        used: monthlyCount,
        tier: user.currentTier,
      },
    });
  } catch (err) {
    console.error("Practice history error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
