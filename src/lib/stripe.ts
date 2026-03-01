import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
  typescript: true,
});

// ── Stripe Product & Price IDs ──────────────────────────────────────
// Subscription tiers
export const PRICE_IDS = {
  launch_monthly: process.env.LAUNCH_MONTHLY_PRICE_ID!,
  launch_annual: process.env.LAUNCH_ANNUAL_PRICE_ID!,
  pro_monthly: process.env.PRO_MONTHLY_PRICE_ID!,
  pro_annual: process.env.PRO_ANNUAL_PRICE_ID!,
  closer_monthly: process.env.CLOSER_MONTHLY_PRICE_ID!,
  closer_annual: process.env.CLOSER_ANNUAL_PRICE_ID!,
  // One-time purchases
  interview_sprint: process.env.INTERVIEW_SPRINT_PRICE_ID!,
  pack_5: process.env.PACK_5_PRICE_ID!,
  pack_10: process.env.PACK_10_PRICE_ID!,
  pack_20: process.env.PACK_20_PRICE_ID!,
} as const;

// Map price IDs to tier info
export function getTierFromPriceId(priceId: string): {
  tier: string;
  cycle: string;
  runsTotal: number;
} | null {
  const map: Record<string, { tier: string; cycle: string; runsTotal: number }> = {
    [PRICE_IDS.launch_monthly]: { tier: "launch", cycle: "monthly", runsTotal: 4 },
    [PRICE_IDS.launch_annual]: { tier: "launch", cycle: "annual", runsTotal: 4 },
    [PRICE_IDS.pro_monthly]: { tier: "pro", cycle: "monthly", runsTotal: 12 },
    [PRICE_IDS.pro_annual]: { tier: "pro", cycle: "annual", runsTotal: 12 },
    [PRICE_IDS.closer_monthly]: { tier: "closer", cycle: "monthly", runsTotal: 25 },
    [PRICE_IDS.closer_annual]: { tier: "closer", cycle: "annual", runsTotal: 25 },
  };
  return map[priceId] || null;
}

// Map price IDs to pack info
export function getPackFromPriceId(priceId: string): {
  type: string;
  runs: number;
  allowedTools: string[];
} | null {
  const map: Record<string, { type: string; runs: number; allowedTools: string[] }> = {
    [PRICE_IDS.interview_sprint]: {
      type: "interview_sprint",
      runs: 6,
      allowedTools: ["interview_outreach", "interview_prep"],
    },
    [PRICE_IDS.pack_5]: { type: "pack_5", runs: 5, allowedTools: [] },
    [PRICE_IDS.pack_10]: { type: "pack_10", runs: 10, allowedTools: [] },
    [PRICE_IDS.pack_20]: { type: "pack_20", runs: 20, allowedTools: [] },
  };
  return map[priceId] || null;
}
