import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET /api/practice/session?id=xxx
// Returns full session detail including transcript, personaConfig, panel info
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
    const sessionId = searchParams.get("id");

    if (!sessionId) {
      return NextResponse.json({ error: "id param required" }, { status: 400 });
    }

    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId, userId: user.id },
      select: {
        id: true,
        targetCompany: true,
        targetRole: true,
        personaName: true,
        personaConfig: true,
        transcript: true,
        durationSeconds: true,
        cotmScore: true,
        feedback: true,
        outcome: true,
        status: true,
        isPanelMode: true,
        panelMemberStates: true,
        sessionSequence: true,
        focusAreas: true,
        targetId: true,
        runRequestId: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Practice session detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
