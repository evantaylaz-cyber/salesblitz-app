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
  description: string;
  deliverables: string[];
  minimumTier: string;
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
  {
    id: "interview_outreach",
    name: "Interview Outreach",
    description: "Research brief, ATS resume, POV deck, handwritten cards, competitive landscape",
    deliverables: ["Research Brief (PDF)", "ATS-Optimized Resume", "POV Deck (5 slides)", "3 Handwritten Cards", "Competitive Landscape", "Polished Deck (24hr)"],
    minimumTier: "launch",
  },
  {
    id: "prospect_outreach",
    name: "Prospect Outreach",
    description: "Research brief, POV deck, handwritten cards, competitive landscape",
    deliverables: ["Research Brief (PDF)", "POV Deck (5 slides)", "3 Handwritten Cards", "Competitive Landscape", "Polished Deck (24hr)"],
    minimumTier: "launch",
  },
  {
    id: "interview_prep",
    name: "Interview Prep",
    description: "Complete prep package: research brief, POV deck, handwritten cards, landscape",
    deliverables: ["Research Brief (PDF)", "POV Deck (5 slides)", "3 Handwritten Cards", "Competitive Landscape", "Polished Deck (24hr)"],
    minimumTier: "pro",
  },
  {
    id: "prospect_prep",
    name: "Prospect Prep",
    description: "Deep account research, discovery plan, POV deck, handwritten cards, landscape",
    deliverables: ["Research Brief (PDF)", "POV Deck (5 slides)", "3 Handwritten Cards", "Competitive Landscape", "Polished Deck (24hr)"],
    minimumTier: "pro",
  },
  {
    id: "deal_audit",
    name: "Deal Audit",
    description: "Qualification scorecard, risk assessment, strategy brief, handwritten cards",
    deliverables: ["Deal Audit Report (PDF)", "3 Handwritten Cards", "Interactive Landscape (Coming Soon)", "Risk Playbook (Coming Soon)"],
    minimumTier: "pro",
  },
  {
    id: "champion_builder",
    name: "Champion Builder",
    description: "Champion strategy brief, handwritten cards, competitive landscape",
    deliverables: ["Champion Strategy Brief (PDF)", "3 Handwritten Cards", "Competitive Landscape", "Internal Selling Deck (Coming Soon)"],
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
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">AltVest</h1>
            {hasSubscription && (
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                {TIER_NAMES[userData!.currentTier!]} Plan
              </span>
            )}
            {userData?.priorityProcessing && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                ⚡ Priority
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:gap-x-8">
            <a href="/requests" className="relative text-sm text-gray-600 hover:text-gray-900">
              My Requests
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Run Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Subscription Runs */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Subscription Runs</span>
              <Zap className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {hasSubscription ? userData!.subscriptionRunsRemaining : 0}
              <span className="text-base font-normal text-gray-400">
                /{hasSubscription ? userData!.subscriptionRunsTotal : 0}
              </span>
            </p>
            {hasSubscription && userData!.subscriptionRunsTotal > 0 && (
              <div className="mt-3 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-indigo-500 transition-all"
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
              <span className="text-sm font-medium text-gray-500">Run Pack Balance</span>
              <Package className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {userData?.runPacks
                .filter((p) => p.type !== "interview_sprint")
                .reduce((sum, p) => sum + p.runsRemaining, 0) || 0}
            </p>
            {userData?.runPacks
              .filter((p) => p.type !== "interview_sprint" && p.runsRemaining > 0)
              .map((p) => (
                <p key={p.id} className="mt-1 text-xs text-gray-400">
                  {p.runsRemaining} runs · expires{" "}
                  {new Date(p.expiresAt).toLocaleDateString()}
                </p>
              ))}
          </div>

          {/* Sprint Runs */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Interview Sprint</span>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {userData?.runPacks
                .filter((p) => p.type === "interview_sprint")
                .reduce((sum, p) => sum + p.runsRemaining, 0) || 0}
            </p>
            {userData?.runPacks
              .filter((p) => p.type === "interview_sprint" && p.runsRemaining > 0)
              .map((p) => (
                <p key={p.id} className="mt-1 text-xs text-gray-400">
                  {p.runsRemaining} runs · expires{" "}
                  {new Date(p.expiresAt).toLocaleDateString()}
                </p>
              ))}
          </div>

          {/* Total */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Total Available</span>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totalAvailableRuns()}</p>
            <a
              href="/subscribe#packs"
              className="mt-2 inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Buy Run Packs <ChevronRight className="ml-0.5 h-3 w-3" />
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
                <h3 className="font-semibold text-gray-900">Set Up Your Profile with AI</h3>
                <p className="text-sm text-gray-500">
                  Chat with AltVest to build your profile, deal stories, and knowledge base. Takes ~10 min.
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
                Start Chat
              </button>
            </div>
          </div>
        )}

        {/* Tools Grid */}
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Your Tools</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const accessible = canAccess(tool.minimumTier) || hasSprintAccess(tool.id);

            return (
              <div
                key={tool.id}
                className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm transition ${
                  accessible ? "hover:shadow-md" : "opacity-70"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                  {!accessible && <Lock className="h-4 w-4 text-gray-400" />}
                </div>
                <p className="mt-1 text-sm text-gray-500">{tool.description}</p>

                <div className="mt-3 flex-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Deliverables
                  </p>
                  <ul className="mt-1 space-y-1">
                    {tool.deliverables.slice(0, 4).map((d) => {
                      const isComingSoon = d.includes("(Coming Soon)");
                      return (
                        <li key={d} className={`flex items-center text-xs ${isComingSoon ? "text-gray-400 italic" : "text-gray-600"}`}>
                          {isComingSoon ? (
                            <Clock className="mr-1.5 h-3 w-3 text-gray-300 shrink-0" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3 w-3 text-emerald-400 shrink-0" />
                          )}
                          {d}
                        </li>
                      );
                    })}
                    {tool.deliverables.length > 4 && (
                      <li className="text-xs text-gray-400">
                        +{tool.deliverables.length - 4} more
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mt-4">
                  {accessible ? (
                    <button
                      onClick={() => handleRunTool(tool.id)}
                      disabled={totalAvailableRuns() === 0}
                      className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {totalAvailableRuns() === 0 ? (
                        "No Runs Remaining"
                      ) : (
                        <>
                          <Zap className="h-4 w-4" /> New Request
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href="/subscribe"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Upgrade to {TIER_NAMES[tool.minimumTier]} to Unlock
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
                    <th className="px-6 py-3">Source</th>
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
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 capitalize">
                          {log.source}
                        </span>
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

      {/* Floating onboarding chat */}
      {chatOpen && (
        <OnboardingChatBubble
          defaultOpen={true}
          onComplete={() => {
            setOnboardingComplete(true);
            // Refresh user data to reflect profile changes
            fetchUserData();
          }}
        />
      )}
    </div>
  );
}
