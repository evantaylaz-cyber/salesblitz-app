import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { normalizeAssets } from "@/lib/normalize-assets";

// GET — fetch a single run request with full execution details
// Used for the detail page and live progress polling
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

    // Ensure user can see this request (personal or team)
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

    // Parse JSON fields for the response
    const steps = Array.isArray(request.steps) ? request.steps : [];
    const assets = normalizeAssets(request.assets, request.toolName);

    // Calculate progress
    const completedSteps = (steps as { status: string }[]).filter(
      (s) => s.status === "completed"
    ).length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return NextResponse.json({
      request: {
        ...request,
        steps,
        assets,
        progress,
        completedSteps,
        totalSteps,
      },
    });
  } catch (error) {
    console.error("Fetch request detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}
