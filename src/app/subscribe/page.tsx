"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Check, Zap, ArrowLeft, Loader2, Star } from "lucide-react";

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
    extras: ["AI Practice Mode (3 sessions/mo)"],
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
    extras: ["AI Practice Mode (10 sessions/mo)", "Priority processing", "Quarterly 30-min strategy call"],
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <h1 className="text-xl font-bold text-gray-900">Choose Your Plan</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Billing Toggle */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!annual ? "text-gray-900" : "text-gray-400"}`}>
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative h-7 w-12 rounded-full transition ${
              annual ? "bg-emerald-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                annual ? "left-5.5 translate-x-0" : "left-0.5"
              }`}
              style={{ left: annual ? "22px" : "2px" }}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-gray-900" : "text-gray-400"}`}>
            Annual
          </span>
          {annual && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
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
                className={`relative rounded-2xl border-2 bg-white p-6 shadow-sm ${
                  tier.highlight
                    ? "border-emerald-500 ring-1 ring-emerald-500"
                    : "border-gray-200"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-gray-900">${price}</span>
                  <span className="text-gray-500">/mo</span>
                  {annual && (
                    <span className="ml-2 text-sm text-gray-400 line-through">
                      ${tier.monthlyPrice}/mo
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {tier.runs} blitzes/month · ${tier.overage}/extra blitz
                </p>

                <button
                  onClick={() => handleCheckout(priceKey)}
                  disabled={isLoading}
                  className={`mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    tier.highlight
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-gray-900 text-white hover:bg-gray-800"
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
                    <div key={t} className="flex items-center text-sm text-gray-700">
                      <Check className="mr-2 h-4 w-4 text-emerald-500 shrink-0" />
                      {t}
                    </div>
                  ))}
                  {tier.lockedTools.map((t) => (
                    <div key={t} className="flex items-center text-sm text-gray-400">
                      <span className="mr-2 h-4 w-4 shrink-0 text-center">🔒</span>
                      {t}
                    </div>
                  ))}
                  {tier.extras?.map((e) => (
                    <div key={e} className="flex items-center text-sm text-emerald-700 font-medium">
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
        <div className="mt-12 rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Interview Sprint</h3>
              <p className="mt-1 text-gray-600">
                3 Interview Prep + 3 Interview Outreach runs. No subscription required.
              </p>
              <p className="mt-1 text-sm text-gray-500">One-time payment · 90-day expiration</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-gray-900">$149</span>
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
          <h2 className="mb-6 text-xl font-bold text-gray-900">Blitz Packs</h2>
          <p className="mb-6 text-gray-500">
            Need more blitzes? Add packs to any plan. Valid for 90 days from purchase.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PACKS.map((pack) => {
              const isLoading = loading === pack.key;
              return (
                <div key={pack.key} className="rounded-xl border bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900">{pack.name}</h3>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    ${pack.price}
                    <span className="text-sm font-normal text-gray-400">
                      {" "}
                      · ${pack.perRun}/blitz
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{pack.runs} blitzes · 90-day expiration</p>
                  <button
                    onClick={() => handleCheckout(pack.key)}
                    disabled={isLoading}
                    className="mt-4 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
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
