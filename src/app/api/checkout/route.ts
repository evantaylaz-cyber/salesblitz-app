import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { stripe, PRICE_IDS, getTierFromPriceId, getPackFromPriceId } from "@/lib/stripe";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceKey, teamId } = await req.json();
    const priceId = PRICE_IDS[priceKey as keyof typeof PRICE_IDS];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    // Get or create DB user
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
          name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
        },
      });
    }

    // If team checkout, verify user is admin/owner of the team
    let team = null;
    if (teamId) {
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
          { error: "Only team admins and owners can manage team billing" },
          { status: 403 }
        );
      }
      team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
    }

    // Get or create Stripe customer (team or personal)
    let stripeCustomerId: string;
    if (team) {
      if (team.stripeCustomerId) {
        stripeCustomerId = team.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${team.name} (Team)`,
          metadata: { teamId: team.id, teamName: team.name },
        });
        stripeCustomerId = customer.id;
        await prisma.team.update({
          where: { id: team.id },
          data: { stripeCustomerId },
        });
      }
    } else {
      stripeCustomerId = user.stripeCustomerId!;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: { clerkId: clerkUser.id, userId: user.id },
        });
        stripeCustomerId = customer.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId },
        });
      }
    }

    // Determine checkout mode
    const tierInfo = getTierFromPriceId(priceId);
    const isSubscription = !!tierInfo;

    // Build metadata (userId for personal, teamId for team)
    const checkoutMetadata: Record<string, string> = team
      ? { teamId: team.id, priceKey }
      : { userId: user.id, priceKey };

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success${team ? `&teamId=${team.id}` : ""}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe?checkout=cancelled`,
      metadata: checkoutMetadata,
      ...(isSubscription && {
        subscription_data: {
          metadata: checkoutMetadata,
        },
      }),
      ...(!isSubscription && {
        payment_intent_data: {
          metadata: checkoutMetadata,
        },
      }),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
