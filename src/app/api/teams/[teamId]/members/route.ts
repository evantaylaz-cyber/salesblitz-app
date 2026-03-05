import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { sendTeamInviteEmail } from "@/lib/email";

// Helper: verify the requester is a team admin/owner
async function verifyTeamAdmin(clerkId: string, teamId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
  });
  if (!user) return null;

  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: user.id,
      inviteStatus: "accepted",
      role: { in: ["owner", "admin"] },
    },
  });

  return membership ? user : null;
}

// GET — list team members
export async function GET(
  _req: NextRequest,
  { params }: { params: { teamId: string } }
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

    // Verify user is a member of this team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: params.teamId,
        userId: user.id,
        inviteStatus: "accepted",
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId: params.teamId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { role: "asc" }, // owner first
        { joinedAt: "asc" },
      ],
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user?.name || null,
        email: m.user?.email || m.inviteEmail,
        role: m.role,
        inviteStatus: m.inviteStatus,
        joinedAt: m.joinedAt,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("List members error:", error);
    return NextResponse.json({ error: "Failed to list members" }, { status: 500 });
  }
}

// POST — invite a new member
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await verifyTeamAdmin(clerkUser.id, params.teamId);
    if (!adminUser) {
      return NextResponse.json(
        { error: "Only team admins and owners can invite members" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, role = "member" } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!["member", "admin"].includes(role)) {
      return NextResponse.json({ error: "Role must be 'member' or 'admin'" }, { status: 400 });
    }

    // Check seat limit
    const team = await prisma.team.findUnique({
      where: { id: params.teamId },
      include: {
        _count: {
          select: {
            members: {
              where: {
                inviteStatus: { in: ["accepted", "pending"] },
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team._count.members >= team.maxSeats) {
      return NextResponse.json(
        { error: `Team is at capacity (${team.maxSeats} seats). Upgrade to add more members.` },
        { status: 400 }
      );
    }

    // Check for existing invite
    const existing = await prisma.teamMember.findFirst({
      where: {
        teamId: params.teamId,
        inviteEmail: email.toLowerCase(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This email has already been invited" },
        { status: 409 }
      );
    }

    // Check if the invited user already has an account
    const invitedUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const member = await prisma.teamMember.create({
      data: {
        teamId: params.teamId,
        userId: invitedUser?.id || null,
        inviteEmail: email.toLowerCase(),
        role,
        inviteStatus: "pending",
        invitedBy: adminUser.id,
      },
    });

    // Send invite email via Resend
    try {
      await sendTeamInviteEmail({
        inviteEmail: email.toLowerCase(),
        teamName: team.name,
        teamId: params.teamId,
        inviterName: adminUser.name || adminUser.email,
        role,
        memberId: member.id,
      });
    } catch (emailErr) {
      console.error("Failed to send invite email (non-blocking):", emailErr);
      // Don't fail the invite if email fails; the invite record is created
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("Invite member error:", error);
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
  }
}

// PATCH — accept invite, change role, or update membership
export async function PATCH(
  req: NextRequest,
  { params }: { params: { teamId: string } }
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

    const body = await req.json();
    const { action, memberId, role } = body;

    // Accept invite
    if (action === "accept_invite") {
      const invite = await prisma.teamMember.findFirst({
        where: {
          teamId: params.teamId,
          inviteEmail: user.email,
          inviteStatus: "pending",
        },
      });

      if (!invite) {
        return NextResponse.json({ error: "No pending invite found" }, { status: 404 });
      }

      const updated = await prisma.teamMember.update({
        where: { id: invite.id },
        data: {
          userId: user.id,
          inviteStatus: "accepted",
          joinedAt: new Date(),
        },
      });

      return NextResponse.json({ member: updated });
    }

    // Decline invite
    if (action === "decline_invite") {
      const invite = await prisma.teamMember.findFirst({
        where: {
          teamId: params.teamId,
          inviteEmail: user.email,
          inviteStatus: "pending",
        },
      });

      if (!invite) {
        return NextResponse.json({ error: "No pending invite found" }, { status: 404 });
      }

      await prisma.teamMember.update({
        where: { id: invite.id },
        data: { inviteStatus: "declined" },
      });

      return NextResponse.json({ success: true });
    }

    // Change role (admin/owner only)
    if (action === "change_role" && memberId && role) {
      const adminUser = await verifyTeamAdmin(clerkUser.id, params.teamId);
      if (!adminUser) {
        return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
      }

      if (!["member", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      // Can't change the owner's role
      const targetMember = await prisma.teamMember.findUnique({
        where: { id: memberId },
      });
      if (targetMember?.role === "owner") {
        return NextResponse.json({ error: "Cannot change owner's role" }, { status: 400 });
      }

      const updated = await prisma.teamMember.update({
        where: { id: memberId },
        data: { role },
      });

      return NextResponse.json({ member: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update member error:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

// DELETE — remove a member (admin/owner) or leave team (self)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string } }
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

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const targetMember = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.teamId !== params.teamId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't remove the owner
    if (targetMember.role === "owner") {
      return NextResponse.json({ error: "Cannot remove the team owner" }, { status: 400 });
    }

    // Self-removal (leaving the team)
    if (targetMember.userId === user.id) {
      await prisma.teamMember.delete({ where: { id: memberId } });
      return NextResponse.json({ success: true, message: "Left the team" });
    }

    // Admin/owner removing someone else
    const adminUser = await verifyTeamAdmin(clerkUser.id, params.teamId);
    if (!adminUser) {
      return NextResponse.json(
        { error: "Only admins can remove other members" },
        { status: 403 }
      );
    }

    await prisma.teamMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
