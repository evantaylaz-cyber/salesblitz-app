import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return only what the frontend needs; strip Stripe IDs & internal fields
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      currentTier: user.currentTier,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionRunsRemaining: user.subscriptionRunsRemaining,
      subscriptionRunsTotal: user.subscriptionRunsTotal,
      priorityProcessing: user.priorityProcessing,
      runPacks: user.runPacks,
      runLogs: user.runLogs,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("User API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
