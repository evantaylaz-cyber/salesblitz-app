import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET — list teams the current user belongs to
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

    const memberships = await prisma.teamMember.findMany({
      where: {
        userId: user.id,
        inviteStatus: "accepted",
      },
      include: {
        team: {
          include: {
            _count: {
              select: { members: { where: { inviteStatus: "accepted" } } },
            },
          },
        },
      },
    });

    const teams = memberships.map((m: any) => ({
      id: m.team.id,
      name: m.team.name,
      slug: m.team.slug,
      description: m.team.description,
      myRole: m.role,
      currentTier: m.team.currentTier,
      billingCycle: m.team.billingCycle,
      subscriptionStatus: m.team.subscriptionStatus,
      subscriptionRunsRemaining: m.team.subscriptionRunsRemaining,
      subscriptionRunsTotal: m.team.subscriptionRunsTotal,
      memberCount: m.team._count.members,
      maxSeats: m.team.maxSeats,
      isOwner: m.team.ownerId === user.id,
      joinedAt: m.joinedAt,
      createdAt: m.team.createdAt,
    }));

    // Also include pending invites
    const pendingInvites = await prisma.teamMember.findMany({
      where: {
        inviteEmail: user.email,
        inviteStatus: "pending",
        userId: null,
      },
      include: {
        team: true,
      },
    });

    return NextResponse.json({
      teams,
      pendingInvites: pendingInvites.map((inv: any) => ({
        id: inv.id,
        teamId: inv.team.id,
        teamName: inv.team.name,
        role: inv.role,
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    console.error("List teams error:", error);
    return NextResponse.json({ error: "Failed to list teams" }, { status: 500 });
  }
}

// POST — create a new team
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { name, description } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Team name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Generate slug from name
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness, append random suffix if needed
    const existingSlug = await prisma.team.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Create team + owner membership in a transaction
    const team = await prisma.$transaction(async (tx: any) => {
      const newTeam = await tx.team.create({
        data: {
          name: name.trim(),
          slug,
          description: description?.trim() || null,
          ownerId: user.id,
          maxSeats: 5, // default, upgradeable
        },
      });

      // Create owner membership (auto-accepted)
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: user.id,
          role: "owner",
          inviteEmail: user.email,
          inviteStatus: "accepted",
          joinedAt: new Date(),
        },
      });

      return newTeam;
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error("Create team error:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
