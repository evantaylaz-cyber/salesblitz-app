import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { teamId } = body;

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let stripeCustomerId: string | null = null;

    if (teamId) {
      // Team billing portal: verify admin/owner
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: user.id,
          inviteStatus: "accepted",
          role: { in: ["owner", "admin"] },
        },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "Only team admins can manage billing" },
          { status: 403 }
        );
      }
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      stripeCustomerId = team?.stripeCustomerId || null;
    } else {
      stripeCustomerId = user.stripeCustomerId;
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard${teamId ? `?teamId=${teamId}` : ""}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
