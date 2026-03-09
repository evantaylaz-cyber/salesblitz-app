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
        userNotes: true,
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

// PATCH /api/practice/session?id=xxx
// Save user's debrief notes after reviewing a session
export async function PATCH(req: NextRequest) {
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

    // Verify ownership
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId, userId: user.id },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await req.json();
    const { userNotes } = body;

    if (typeof userNotes !== "string") {
      return NextResponse.json({ error: "userNotes must be a string" }, { status: 400 });
    }

    // Cap at 5K characters
    const trimmedNotes = userNotes.slice(0, 5000);

    const updated = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: { userNotes: trimmedNotes },
      select: { id: true, userNotes: true },
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (err) {
    console.error("Update practice session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
