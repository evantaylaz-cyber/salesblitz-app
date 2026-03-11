"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Loader2,
  CreditCard,
  Package,
  Clock,
  Zap,
} from "lucide-react";
import AppNav from "@/components/AppNav";

interface UserData {
  id: string;
  currentTier: string | null;
  billingCycle: string | null;
  subscriptionStatus: string;
  subscriptionRunsRemaining: number;
  subscriptionRunsTotal: number;
  currentPeriodEnd: string | null;
  priorityProcessing: boolean;
  runPacks: {
    id: string;
    type: string;
    runsRemaining: number;
    runsTotal: number;
    expiresAt: string;
  }[];
}

export default function BillingPage() {
  const { isLoaded } = useUser();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed to open billing portal");
    } catch {
      alert("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const hasSubscription =
    user?.subscriptionStatus === "active" ||
    user?.subscriptionStatus === "past_due";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav currentPage="/billing" />

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Current Plan */}
        <section className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Current Plan</h2>
          </div>

          {hasSubscription && user?.currentTier ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-400 capitalize">
                  {user.currentTier}
                </span>
                <span className="text-sm text-neutral-400 capitalize">
                  {user.billingCycle} billing
                </span>
                {user.priorityProcessing && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
                    Priority
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-300">
                {user.subscriptionRunsRemaining} of{" "}
                {user.subscriptionRunsTotal} subscription runs remaining
              </p>
              {user.currentPeriodEnd && (
                <p className="text-sm text-neutral-400">
                  Current period ends{" "}
                  {new Date(user.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              {user.subscriptionStatus === "past_due" && (
                <p className="text-sm text-red-400 font-medium">
                  Payment past due. Please update your payment method.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-neutral-300">No active subscription.</p>
              <a
                href="/subscribe"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                <Zap className="h-4 w-4" /> Choose a Plan
              </a>
            </div>
          )}

          {hasSubscription && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#333333] bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-[#0a0a0a] disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Manage Subscription"
              )}
            </button>
          )}
        </section>

        {/* Run Packs */}
        <section className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Run Packs</h2>
          </div>

          {user?.runPacks && user.runPacks.length > 0 ? (
            <div className="space-y-3">
              {user.runPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium text-white capitalize">
                      {pack.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-neutral-400">
                      {pack.runsRemaining} of {pack.runsTotal} runs remaining
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <Clock className="h-4 w-4" />
                    Expires {new Date(pack.expiresAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-400">No active run packs.</p>
          )}

          <a
            href="/subscribe#packs"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-400"
          >
            Buy Run Packs →
          </a>
        </section>
      </main>
    </div>
  );
}
