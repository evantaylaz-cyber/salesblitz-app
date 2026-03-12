"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Check, Zap, Loader2, Star, Lock } from "lucide-react";
import AppNav from "@/components/AppNav";

const TIERS = [
  {
    name: "Launch",
    monthlyPrice: 49,
    annualPrice: 39,
    monthlyKey: "launch_monthly",
    annualKey: "launch_annual",
    runs: 4,
    overage: 15,
    tools: ["Interview Outreach", "Prospect Outreach"],
    lockedTools: ["Interview Prep", "Prospect Prep", "AI Practice Mode", "Deal Audit", "Champion Builder"],
    highlight: false,
  },
  {
    name: "Pro",
    monthlyPrice: 99,
    annualPrice: 79,
    monthlyKey: "pro_monthly",
    annualKey: "pro_annual",
    runs: 12,
    overage: 12,
    tools: ["Interview Outreach", "Prospect Outreach", "Interview Prep", "Prospect Prep"],
    lockedTools: ["Deal Audit", "Champion Builder"],
    extras: ["AI Practice Mode: calls & interviews (3 sessions/mo)"],
    highlight: true,
  },
  {
    name: "Closer",
    monthlyPrice: 179,
    annualPrice: 149,
    monthlyKey: "closer_monthly",
    annualKey: "closer_annual",
    runs: 25,
    overage: 10,
    tools: [
      "Interview Outreach",
      "Prospect Outreach",
      "Interview Prep",
      "Prospect Prep",
      "Deal Audit",
      "Champion Builder",
    ],
    lockedTools: [],
    extras: ["AI Practice Mode: calls & interviews (10 sessions/mo)", "Priority processing", "Quarterly 30-min strategy call"],
    highlight: false,
  },
];

const PACKS = [
  { name: "5-Pack", runs: 5, price: 60, perRun: 12, key: "pack_5" },
  { name: "10-Pack", runs: 10, price: 100, perRun: 10, key: "pack_10" },
  { name: "20-Pack", runs: 20, price: 160, perRun: 8, key: "pack_20" },
];

export default function SubscribePage() {
  const { isLoaded } = useUser();
  const [annual, setAnnual] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(priceKey: string) {
    setLoading(priceKey);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed to create checkout");
    } catch (e) {
      alert("Failed to create checkout");
    } finally {
      setLoading(null);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav currentPage="/subscribe" />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Headline */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Name your target. Show up ready for whatever&apos;s next.
          </h1>
          <p className="mt-3 text-lg text-neutral-400 max-w-2xl mx-auto">
            Deep research, cold outreach sequences, competitive intel, playbooks & live AI practice. Whether you're prospecting or interviewing, one blitz replaces five tools. Cancel anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!annual ? "text-white" : "text-neutral-500"}`}>
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative h-7 w-12 rounded-full transition ${
              annual ? "bg-emerald-600" : "bg-neutral-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-[#141414] shadow transition ${
                annual ? "left-5.5 translate-x-0" : "left-0.5"
              }`}
              style={{ left: annual ? "22px" : "2px" }}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-white" : "text-neutral-500"}`}>
            Annual
          </span>
          {annual && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              Save ~20%
            </span>
          )}
        </div>

        {/* Subscription Tiers */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map((tier) => {
            const priceKey = annual ? tier.annualKey : tier.monthlyKey;
            const price = annual ? tier.annualPrice : tier.monthlyPrice;
            const isLoading = loading === priceKey;

            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl border-2 bg-[#141414] p-6 shadow-sm shadow-black/20 ${
                  tier.highlight
                    ? "border-emerald-500 ring-1 ring-emerald-500"
                    : "border-[#262626]"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-white">${price}</span>
                  <span className="text-neutral-400">/mo</span>
                  {annual && (
                    <span className="ml-2 text-sm text-neutral-500 line-through">
                      ${tier.monthlyPrice}/mo
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-neutral-400">
                  {tier.runs} blitzes/month · ${tier.overage}/extra blitz
                </p>

                <button
                  onClick={() => handleCheckout(priceKey)}
                  disabled={isLoading}
                  className={`mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    tier.highlight
                      ? "bg-emerald-500 text-black hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : "bg-[#1a1a1a] text-white hover:bg-[#262626]"
                  } disabled:opacity-50`}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-4 w-4" /> Get {tier.name}
                    </>
                  )}
                </button>

                <div className="mt-5 space-y-2">
                  {tier.tools.map((t) => (
                    <div key={t} className="flex items-center text-sm text-neutral-200">
                      <Check className="mr-2 h-4 w-4 text-emerald-500 shrink-0" />
                      {t}
                    </div>
                  ))}
                  {tier.lockedTools.map((t) => (
                    <div key={t} className="flex items-center text-sm text-neutral-500">
                      <Lock className="mr-2 h-4 w-4 shrink-0 text-neutral-500" />
                      {t}
                    </div>
                  ))}
                  {tier.extras?.map((e) => (
                    <div key={e} className="flex items-center text-sm text-emerald-400 font-medium">
                      <Star className="mr-2 h-4 w-4 text-amber-500 shrink-0" />
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Interview Sprint */}
        <div className="mt-12 rounded-2xl border-2 border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-amber-500/10 p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white">Interview Sprint</h3>
              <p className="mt-1 text-neutral-300">
                3 Interview Prep + 3 Interview Outreach runs. No subscription required.
              </p>
              <p className="mt-1 text-sm text-neutral-400">One-time payment · 90-day expiration</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-white">$149</span>
              <button
                onClick={() => handleCheckout("interview_sprint")}
                disabled={loading === "interview_sprint"}
                className="rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading === "interview_sprint" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buy Sprint"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Run Packs */}
        <div id="packs" className="mt-12">
          <h2 className="mb-6 text-xl font-bold text-white">Blitz Packs</h2>
          <p className="mb-6 text-neutral-400">
            Need more blitzes? Add packs to any plan. Valid for 90 days from purchase.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PACKS.map((pack) => {
              const isLoading = loading === pack.key;
              return (
                <div key={pack.key} className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
                  <h3 className="font-semibold text-white">{pack.name}</h3>
                  <p className="mt-1 text-2xl font-bold text-white">
                    ${pack.price}
                    <span className="text-sm font-normal text-neutral-500">
                      {" "}
                      · ${pack.perRun}/blitz
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">{pack.runs} blitzes · 90-day expiration</p>
                  <button
                    onClick={() => handleCheckout(pack.key)}
                    disabled={isLoading}
                    className="mt-4 w-full rounded-lg border-2 border-[#262626] bg-[#141414] px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-[#0a0a0a] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy Pack"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
