import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { triggerEmbed } from "@/lib/trigger-worker";

// POST — create a debrief for a run request
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const request = await prisma.runRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Ensure user owns this request (or team member)
    let canAccess = request.userId === user.id;
    if (!canAccess && request.teamId) {
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId: request.teamId,
          userId: user.id,
          inviteStatus: "accepted",
        },
      });
      canAccess = !!membership;
    }
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { content, outcome, nextSteps } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Debrief content is required" },
        { status: 400 }
      );
    }

    const debrief = await prisma.runDebrief.create({
      data: {
        runRequestId: params.id,
        userId: user.id,
        content: content.trim(),
        outcome: outcome || null,
        nextSteps: nextSteps || null,
      },
    });

    // Trigger async embedding for cross-company intelligence (fire-and-forget)
    triggerEmbed({
      type: "debrief",
      id: debrief.id,
      content: content.trim(),
      outcome: outcome || null,
      targetCompany: request.targetCompany,
      toolName: request.toolName,
    });

    return NextResponse.json({ debrief }, { status: 201 });
  } catch (error) {
    console.error("[DEBRIEF] Error creating debrief:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET — fetch debriefs for a run request
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const request = await prisma.runRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    let canAccess = request.userId === user.id;
    if (!canAccess && request.teamId) {
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId: request.teamId,
          userId: user.id,
          inviteStatus: "accepted",
        },
      });
      canAccess = !!membership;
    }
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const debriefs = await prisma.runDebrief.findMany({
      where: { runRequestId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ debriefs });
  } catch (error) {
    console.error("[DEBRIEF] Error fetching debriefs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
