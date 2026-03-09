"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
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
  Mail,
  Users,
  AlertCircle,
} from "lucide-react";
import AppNav from "@/components/AppNav";
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
    targetName: string | null;
    targetCompany: string | null;
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
  practice_mode: "AI Practice Mode",
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
    id: "practice_mode",
    name: "AI Practice Mode",
    hook: "Rehearse before the real thing.",
    description: "Live roleplay against an AI persona built from your research. Works for prospect calls, interviews & panels. Scored on 8 dimensions.",
    minimumTier: "pro",
  },
  // Row 2: Prospect workflow + deal management
  {
    id: "prospect_outreach",
    name: "Prospect Outreach",
    hook: "Get the meeting.",
    description: "Outreach sequences that earn replies. Personalized to each account's pain points.",
    minimumTier: "launch",
  },
  {
    id: "prospect_prep",
    name: "Prospect Prep",
    hook: "Own the call.",
    description: "Walk in knowing their org chart, pain points & competitive landscape. CotM-structured.",
    minimumTier: "pro",
  },
  {
    id: "deal_audit",
    name: "Deal Audit",
    hook: "Stress-test your deal.",
    description: "Qualification scorecard, risk flags, and a strategy to close the gaps.",
    minimumTier: "closer",
  },
  // Row 3: Deal management
  {
    id: "champion_builder",
    name: "Champion Builder",
    hook: "Arm your champion.",
    description: "Stakeholder maps, internal selling kits, and competitive ammo.",
    minimumTier: "closer",
  },
  // Row 4: Coming Soon — Closer tier teasers
  {
    id: "territory_blitz",
    name: "Territory Blitz",
    hook: "Map your entire territory.",
    description: "Upload a target list, get research & outreach for every account in one blitz.",
    minimumTier: "closer",
    comingSoon: true,
  },
  {
    id: "win_loss_analyst",
    name: "Win/Loss Analyst",
    hook: "Learn from every deal.",
    description: "Upload closed deal transcripts. Get pattern analysis, methodology gaps, and coaching recs.",
    minimumTier: "closer",
    comingSoon: true,
  },
];

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingDepth, setOnboardingDepth] = useState(0);
  // mobileMenuOpen state removed — now handled by AppNav component

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
        if (data.profile?.onboardingDepth !== undefined) {
          setOnboardingDepth(data.profile.onboardingDepth);
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
    if (toolId === "practice_mode") {
      window.location.href = `/practice`;
    } else {
      window.location.href = `/request?tool=${toolId}`;
    }
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  const hasSubscription = userData?.subscriptionStatus === "active" && userData?.currentTier;
  const isMaxTier = userData?.currentTier === "closer";

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav
        currentPage="/dashboard"
        pendingRequests={pendingRequests}
        hasSubscription={!!hasSubscription}
        isMaxTier={isMaxTier}
        onManageBilling={handleManageBilling}
        tierBadge={hasSubscription && userData?.currentTier ? TIER_NAMES[userData.currentTier] : undefined}
        hasPriority={userData?.priorityProcessing}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Pending requests banner */}
        {pendingRequests > 0 && (
          <a
            href="/requests"
            className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 transition hover:bg-emerald-100"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
                {pendingRequests}
              </div>
              <span className="text-sm font-medium text-emerald-900">
                {pendingRequests === 1 ? "Blitz in progress" : `${pendingRequests} blitzes in progress`}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-emerald-600" />
          </a>
        )}

        {/* Run Stats — Total first, then breakdown */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Total Available */}
          <div className="rounded-xl border-2 border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Blitzes Available</span>
              <Zap className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{totalAvailableRuns()}</p>
            {totalAvailableRuns() === 0 ? (
              <a
                href="/subscribe#packs"
                className="mt-2 inline-flex items-center text-xs font-medium text-emerald-700 hover:text-emerald-900"
              >
                Get more blitzes <ChevronRight className="ml-0.5 h-3 w-3" />
              </a>
            ) : (
              <p className="mt-2 text-xs text-gray-400">
                {hasSubscription && userData!.currentPeriodEnd
                  ? `Subscription resets ${new Date(userData!.currentPeriodEnd).toLocaleDateString()}`
                  : "Use them on any tool below"}
              </p>
            )}
          </div>

          {/* Subscription Runs */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Subscription</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
                  className="h-1.5 rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${(userData!.subscriptionRunsRemaining / userData!.subscriptionRunsTotal) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Pack Runs */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Packs</span>
              <Package className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {userData?.runPacks
                .filter((p: { type: string }) => p.type !== "interview_sprint")
                .reduce((sum: number, p: { runsRemaining: number }) => sum + p.runsRemaining, 0) || 0}
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
                .filter((p: { type: string }) => p.type === "interview_sprint")
                .reduce((sum: number, p: { runsRemaining: number }) => sum + p.runsRemaining, 0) || 0}
            </p>
          </div>
        </div>

        {/* AI Profile Setup Banner — depth-aware */}
        {onboardingDepth < 4 && (
          <div className="mb-8 flex items-center justify-between rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Sparkles className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {onboardingDepth === 0 && "Complete your profile"}
                  {onboardingDepth === 1 && "Deepen your profile"}
                  {onboardingDepth === 2 && "Add territory & career context"}
                  {onboardingDepth === 3 && "Dial in your writing voice"}
                </h3>
                <p className="text-sm text-gray-500">
                  {onboardingDepth === 0 && "Personalize your AI so every blitz matches your selling style. Takes ~3 min."}
                  {onboardingDepth === 1 && "Add deal stories & methodology to sharpen your output. Takes ~5 min."}
                  {onboardingDepth === 2 && "Add ICP definitions, territory focus, and career context. Takes ~5 min."}
                  {onboardingDepth === 3 && "Final layer: writing style, banned phrases, signature patterns."}
                </p>
                {onboardingDepth > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 w-8 rounded-full ${
                          level <= onboardingDepth ? "bg-emerald-500" : "bg-gray-200"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">{onboardingDepth}/4</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/profile"
                className="text-xs text-gray-400 hover:text-gray-600 transition whitespace-nowrap"
              >
                Manual setup
              </a>
              <button
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4" />
                {onboardingDepth === 0 ? "Start" : "Continue"}
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
                  <h3 className="font-semibold text-gray-900">See a sample blitz</h3>
                  <p className="text-sm text-gray-500">
                    Preview a completed package before you buy.
                  </p>
                </div>
              </div>
              <a
                href="/demo/prospect_prep"
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 transition whitespace-nowrap"
              >
                <Eye className="h-4 w-4" />
                View
              </a>
            </div>
          </div>
        )}

        {/* Tools Grid */}
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Blitz Tools</h2>
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
                      className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {totalAvailableRuns() === 0 ? (
                        "No Blitzes Remaining"
                      ) : (
                        <>
                          <Zap className="h-4 w-4" /> New Blitz
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href="/subscribe"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Blitzes</h2>
              <a href="/requests" className="text-sm text-emerald-700 hover:text-emerald-900">
                View all
              </a>
            </div>
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Tool</th>
                    <th className="px-6 py-3">Prospect</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {userData.runLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/requests/${log.id}`}>
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {TOOL_NAMES[log.toolName] || log.toolName}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {log.targetName && log.targetCompany
                          ? `${log.targetName} @ ${log.targetCompany}`
                          : log.targetCompany || log.targetName || "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        {log.status === "completed" || log.status === "delivered" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Done
                          </span>
                        ) : log.status === "failed" ? (
                          <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
                            <XCircle className="h-3.5 w-3.5" /> Failed
                          </span>
                        ) : log.status === "awaiting_clarification" ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                            <AlertCircle className="h-3.5 w-3.5" /> Needs Input
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-500 text-xs font-medium">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Consulting CTA */}
        <div className="mt-10 rounded-xl border border-gray-800 bg-gray-900 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Want us to run it for you?</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Custom outbound engine for your sales team. We build targeting, sequencing & deliver qualified meetings. Outcome-based pricing.
                </p>
              </div>
            </div>
            <a
              href="mailto:evan@salesblitz.ai?subject=Sales%20Blitz%20Consulting"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Mail className="h-4 w-4" />
              Talk to Us
            </a>
          </div>
        </div>
      </main>

      {/* Floating AI chat — always rendered so the bubble is visible */}
      <OnboardingChatBubble
        defaultOpen={chatOpen}
        key={chatOpen ? "forced-open" : "default"}
        currentDepth={onboardingDepth}
        onDepthChange={(newDepth) => {
          setOnboardingDepth(newDepth);
          if (newDepth >= 1) setOnboardingComplete(true);
          fetchUserData();
        }}
      />
    </div>
  );
}
