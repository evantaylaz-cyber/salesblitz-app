import { NextRequest, NextResponse } from "next/server";
import { stripe, getTierFromPriceId, getPackFromPriceId } from "@/lib/stripe";
import prisma from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.warn("checkout.session.completed: No userId in metadata", { sessionId: session.id, metadata: session.metadata });
    return;
  }

  if (session.mode === "payment") {
    // One-time purchase: Interview Sprint or Run Pack
    const priceKey = session.metadata?.priceKey;
    if (!priceKey) {
      console.warn("checkout.session.completed (payment): No priceKey in metadata", { sessionId: session.id, userId });
      return;
    }

    // We need to look up the price to determine what was purchased
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    if (!priceId) {
      console.warn("checkout.session.completed (payment): No priceId in line items", { sessionId: session.id, userId });
      return;
    }

    const packInfo = getPackFromPriceId(priceId);
    if (!packInfo) {
      console.warn("checkout.session.completed (payment): Unknown priceId", { sessionId: session.id, priceId, userId });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await prisma.runPack.create({
      data: {
        userId,
        runsRemaining: packInfo.runs,
        runsTotal: packInfo.runs,
        expiresAt,
        type: packInfo.type,
        allowedTools: packInfo.allowedTools,
        stripePaymentId: session.payment_intent as string,
      },
    });
    console.log("checkout.session.completed: RunPack created", { userId, type: packInfo.type, runs: packInfo.runs });
  }

  if (session.mode === "subscription") {
    // Subscription — handled by subscription.updated webhook
    // But we ensure the subscription ID is linked
    const subscriptionId = session.subscription as string;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await handleSubscriptionUpdated(subscription);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.warn("subscription.updated: No userId in metadata", { subscriptionId: subscription.id, metadata: subscription.metadata });
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    console.warn("subscription.updated: No priceId in subscription items", { subscriptionId: subscription.id, userId });
    return;
  }

  const tierInfo = getTierFromPriceId(priceId);
  if (!tierInfo) {
    console.warn("subscription.updated: Unknown priceId", { subscriptionId: subscription.id, priceId, userId });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.warn("subscription.updated: User not found in DB", { subscriptionId: subscription.id, userId });
    return;
  }

  // Only reset runs if this is a new subscription or tier change
  const isNewOrUpgraded =
    user.stripeSubscriptionId !== subscription.id ||
    user.currentTier !== tierInfo.tier;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      currentTier: tierInfo.tier,
      billingCycle: tierInfo.cycle,
      subscriptionStatus: subscription.status,
      subscriptionRunsTotal: tierInfo.runsTotal,
      ...(isNewOrUpgraded && { subscriptionRunsRemaining: tierInfo.runsTotal }),
      priorityProcessing: tierInfo.tier === "closer",
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.warn("subscription.deleted: No userId in metadata", { subscriptionId: subscription.id, metadata: subscription.metadata });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentTier: null,
      billingCycle: null,
      subscriptionStatus: "canceled",
      subscriptionRunsRemaining: 0,
      subscriptionRunsTotal: 0,
      priorityProcessing: false,
      stripeSubscriptionId: null,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Reset subscription runs on successful billing cycle renewal
  if (!invoice.subscription) {
    console.log("invoice.paid: No subscription on invoice (one-time payment)", { invoiceId: invoice.id });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.warn("invoice.paid: No userId in subscription metadata", { invoiceId: invoice.id, subscriptionId: subscription.id });
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    console.warn("invoice.paid: No priceId in subscription items", { invoiceId: invoice.id, subscriptionId: subscription.id, userId });
    return;
  }

  const tierInfo = getTierFromPriceId(priceId);
  if (!tierInfo) {
    console.warn("invoice.paid: Unknown priceId", { invoiceId: invoice.id, priceId, userId });
    return;
  }

  // Only reset runs for renewal invoices (not the first invoice)
  if (invoice.billing_reason === "subscription_cycle") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionRunsRemaining: tierInfo.runsTotal,
        subscriptionStatus: "active",
      },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    console.log("invoice.payment_failed: No subscription on invoice", { invoiceId: invoice.id });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.warn("invoice.payment_failed: No userId in subscription metadata", { invoiceId: invoice.id, subscriptionId: subscription.id });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: "past_due" },
  });
}
