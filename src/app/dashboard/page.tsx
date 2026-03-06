"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import {
  Zap,
  Lock,
  ArrowUpRight,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Sparkles,
  Eye,
  Menu,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";

const OnboardingChatBubble = dynamic(
  () => import("@/components/OnboardingChatBubble"),
  { ssr: false }
);

interface UserData {
  currentTier: string | null;
  billingCycle: string | null;
  subscriptionRunsRemaining: number;
  subscriptionRunsTotal: number;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  priorityProcessing: boolean;
  runPacks: {
    id: string;
    runsRemaining: number;
    runsTotal: number;
    expiresAt: string;
    type: string;
    allowedTools: string[];
  }[];
  runLogs: {
    id: string;
    toolName: string;
    createdAt: string;
    source: string;
    status: string;
  }[];
}

interface Tool {
  id: string;
  name: string;
  hook: string;
  description: string;
  minimumTier: string;
  comingSoon?: boolean;
}

const TIER_RANK: Record<string, number> = { launch: 1, pro: 2, closer: 3 };
const TIER_NAMES: Record<string, string> = {
  launch: "Launch",
  pro: "Pro",
  closer: "Closer",
};
const TOOL_NAMES: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  prospect_outreach: "Prospect Outreach",
  interview_prep: "Interview Prep",
  prospect_prep: "Prospect Prep",
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
};

const TOOLS: Tool[] = [
  // Row 1: Interview workflow + deal diagnostic
  {
    id: "interview_outreach",
    name: "Interview Outreach",
    hook: "Land the interview.",
    description: "Resume, outreach sequence, and a research package that gets you noticed.",
    minimumTier: "launch",
  },
  {
    id: "interview_prep",
    name: "Interview Prep",
    hook: "Win the interview.",
    description: "Call playbooks, competitive intel, and prep docs tailored to your meeting.",
    minimumTier: "pro",
  },
  {
    id: "deal_audit",
    name: "Deal Audit",
    hook: "Stress-test your deal.",
    description: "Qualification scorecard, risk flags, and a strategy to close the gaps.",
    minimumTier: "pro",
  },
  // Row 2: Prospect workflow + champion strategy
  {
    id: "prospect_outreach",
    name: "Prospect Outreach",
    hook: "Get the meeting.",
    description: "Multi-channel sequences backed by deep account intelligence.",
    minimumTier: "launch",
  },
  {
    id: "prospect_prep",
    name: "Prospect Prep",
    hook: "Own the call.",
    description: "Discovery plans, stakeholder maps, and competitive positioning for any meeting type.",
    minimumTier: "pro",
  },
  {
    id: "champion_builder",
    name: "Champion Builder",
    hook: "Arm your champion.",
    description: "Stakeholder maps, internal selling kits, and competitive ammo.",
    minimumTier: "closer",
  },
];

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && clerkUser) {
      fetchUserData();
      fetchRequests();
      checkOnboardingStatus();
    }
  }, [isLoaded, clerkUser?.id]);

  async function checkOnboardingStatus() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile?.onboardingCompleted) {
          setOnboardingComplete(true);
        }
      }
    } catch {}
  }

  async function fetchRequests() {
    try {
      const res = await fetch("/api/requests");
      if (res.ok) {
        const data = await res.json();
        const active = data.requests.filter(
          (r: { status: string }) => r.status === "submitted" || r.status === "in_progress" || r.status === "ready"
        );
        setPendingRequests(active.length);
      }
    } catch {}
  }

  async function fetchUserData() {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (e) {
      console.error("Failed to fetch user data:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleRunTool(toolId: string) {
    window.location.href = `/request?tool=${toolId}`;
  }

  async function handleManageBilling() {
    const res = await fetch("/api/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  function canAccess(toolMinTier: string): boolean {
    if (!userData?.currentTier || userData.subscriptionStatus !== "active") return false;
    return (TIER_RANK[userData.currentTier] || 0) >= (TIER_RANK[toolMinTier] || 0);
  }

  function hasSprintAccess(toolId: string): boolean {
    if (!userData) return false;
    return userData.runPacks.some(
      (p) => p.type === "interview_sprint" && p.allowedTools.includes(toolId) && p.runsRemaining > 0
    );
  }

  function totalAvailableRuns(): number {
    if (!userData) return 0;
    const subRuns = userData.subscriptionStatus === "active" ? userData.subscriptionRunsRemaining : 0;
    const packRuns = userData.runPacks
      .filter((p) => p.type !== "interview_sprint")
      .reduce((sum, p) => sum + p.runsRemaining, 0);
    const sprintRuns = userData.runPacks
      .filter((p) => p.type === "interview_sprint")
      .reduce((sum, p) => sum + p.runsRemaining, 0);
    return subRuns + packRuns + sprintRuns;
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const hasSubscription = userData?.subscriptionStatus === "active" && userData?.currentTier;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white relative">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">AltVest</h1>
            {hasSubscription && (
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                {TIER_NAMES[userData!.currentTier!]}
              </span>
            )}
            {userData?.priorityProcessing && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                Priority
              </span>
            )}
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-x-8">
            <a href="/requests" className="relative text-sm text-gray-600 hover:text-gray-900">
              Requests
              {pendingRequests > 0 && (
                <span className="absolute -top-1.5 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {pendingRequests}
                </span>
              )}
            </a>
            <a href="/profile" className="text-sm text-gray-600 hover:text-gray-900">
              Profile
            </a>
            <a href="/knowledge-base" className="text-sm text-gray-600 hover:text-gray-900">
              Knowledge Base
            </a>
            <a href="/playbooks" className="text-sm text-gray-600 hover:text-gray-900">
              Playbooks
            </a>
            <a href="/teams" className="text-sm text-gray-600 hover:text-gray-900">
              Teams
            </a>
            <a href="/analytics" className="text-sm text-gray-600 hover:text-gray-900">
              Analytics
            </a>
            {hasSubscription && (
              <button
                onClick={handleManageBilling}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Billing
              </button>
            )}
            <a
              href="/subscribe"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              {hasSubscription ? "Upgrade" : "Subscribe"}
            </a>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>

          {/* Mobile nav */}
          <div className="flex lg:hidden items-center gap-4">
            <a href="/requests" className="relative text-sm text-gray-600 hover:text-gray-900">
              Requests
              {pendingRequests > 0 && (
                <span className="absolute -top-1.5 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {pendingRequests}
                </span>
              )}
            </a>
            <UserButton afterSignOutUrl="/sign-in" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-white px-6 py-3 space-y-1">
            <a href="/profile" className="block rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Profile
            </a>
            <a href="/knowledge-base" className="block rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Knowledge Base
            </a>
            <a href="/playbooks" className="block rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Playbooks
            </a>
            <a href="/teams" className="block rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Teams
            </a>
            <a href="/analytics" className="block rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Analytics
            </a>
            {hasSubscription && (
              <button
                onClick={() => { handleManageBilling(); setMobileMenuOpen(false); }}
                className="block w-full text-left rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Billing
              </button>
            )}
            <a
              href="/subscribe"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              {hasSubscription ? "Upgrade" : "Subscribe"}
            </a>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Run Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Subscription Runs */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Subscription</span>
              <Zap className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {hasSubscription ? userData!.subscriptionRunsRemaining : 0}
              <span className="text-base font-normal text-gray-400">
                /{hasSubscription ? userData!.subscriptionRunsTotal : 0}
              </span>
            </p>
            {hasSubscription && userData!.subscriptionRunsTotal > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-indigo-500 transition-all"
                  style={{
                    width: `${(userData!.subscriptionRunsRemaining / userData!.subscriptionRunsTotal) * 100}%`,
                  }}
                />
              </div>
            )}
            {hasSubscription && userData!.currentPeriodEnd && (
              <p className="mt-2 text-xs text-gray-400">
                Resets {new Date(userData!.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Pack Runs */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Run Packs</span>
              <Package className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {userData?.runPacks
                .filter((p) => p.type !== "interview_sprint")
                .reduce((sum, p) => sum + p.runsRemaining, 0) || 0}
            </p>
          </div>

          {/* Sprint Runs */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Sprint</span>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {userData?.runPacks
                .filter((p) => p.type === "interview_sprint")
                .reduce((sum, p) => sum + p.runsRemaining, 0) || 0}
            </p>
          </div>

          {/* Total */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Total</span>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totalAvailableRuns()}</p>
            <a
              href="/subscribe#packs"
              className="mt-2 inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Buy more <ChevronRight className="ml-0.5 h-3 w-3" />
            </a>
          </div>
        </div>

        {/* AI Profile Setup Banner */}
        {!onboardingComplete && (
          <div className="mb-8 flex items-center justify-between rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Complete your profile</h3>
                <p className="text-sm text-gray-500">
                  Personalize your AI so every run matches your selling style.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/onboarding/ai-setup"
                className="text-xs text-gray-400 hover:text-gray-600 transition whitespace-nowrap"
              >
                Manual setup
              </a>
              <button
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4" />
                Start
              </button>
            </div>
          </div>
        )}

        {/* Sample Run Banner */}
        {userData && (!userData.runLogs || userData.runLogs.length === 0) && (
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Eye className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">See a sample run</h3>
                  <p className="text-sm text-gray-500">
                    Preview a completed package before you buy.
                  </p>
                </div>
              </div>
              <a
                href="/demo/prospect_prep"
                className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition whitespace-nowrap"
              >
                <Eye className="h-4 w-4" />
                View
              </a>
            </div>
          </div>
        )}

        {/* Tools Grid */}
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Your Tools</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const accessible = !tool.comingSoon && (canAccess(tool.minimumTier) || hasSprintAccess(tool.id));

            return (
              <div
                key={tool.id}
                className={`relative flex flex-col rounded-xl border bg-white p-6 shadow-sm transition ${
                  tool.comingSoon ? "opacity-60" : accessible ? "hover:shadow-md" : "opacity-70"
                }`}
              >
                {/* Coming Soon overlay */}
                {tool.comingSoon && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                    <span className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white tracking-wide uppercase shadow-lg">
                      Coming Soon
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                  {!accessible && !tool.comingSoon && <Lock className="h-4 w-4 text-gray-400" />}
                </div>
                <p className="mt-2 flex-1 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{tool.hook}</span>{" "}
                  {tool.description}
                </p>

                <div className="mt-5">
                  {tool.comingSoon ? (
                    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400 text-center">
                      Coming Soon
                    </div>
                  ) : accessible ? (
                    <button
                      onClick={() => handleRunTool(tool.id)}
                      disabled={totalAvailableRuns() === 0}
                      className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {totalAvailableRuns() === 0 ? (
                        "No Runs Remaining"
                      ) : (
                        <>
                          <Zap className="h-4 w-4" /> New Run
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href="/subscribe"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Unlock with {TIER_NAMES[tool.minimumTier]}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Runs */}
        {userData?.runLogs && userData.runLogs.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Runs</h2>
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Tool</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {userData.runLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {TOOL_NAMES[log.toolName] || log.toolName}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        {log.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : log.status === "failed" ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Floating onboarding chat — always rendered so the bubble is visible */}
      <OnboardingChatBubble
        defaultOpen={chatOpen}
        key={chatOpen ? "forced-open" : "default"}
        onComplete={() => {
          setOnboardingComplete(true);
          fetchUserData();
        }}
      />
    </div>
  );
}
