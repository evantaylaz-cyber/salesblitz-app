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
  Play,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import MeetingRecordings from "@/components/MeetingRecordings";
import WinLossIntelligence from "@/components/WinLossIntelligence";
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
}

interface RecentRequest {
  id: string;
  toolName: string;
  targetName: string | null;
  targetCompany: string | null;
  createdAt: string;
  status: string;
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
  territory_blitz: "Territory Blitz",
  win_loss_analyst: "Win/Loss Analyst",
};

const TOOLS: Tool[] = [
  {
    id: "interview_outreach",
    name: "Interview Outreach",
    hook: "Land the interview. Skip the job board.",
    description: "Cold outreach sequences that get referrals, not silence. Research the company, find the right contact, then reach out like you already belong.",
    minimumTier: "launch",
  },
  {
    id: "interview_prep",
    name: "Interview Prep",
    hook: "Know more than they expect.",
    description: "Deep research on the company, the role & every interviewer. POV deck, speaker notes & competitive intel per panelist.",
    minimumTier: "pro",
  },
  {
    id: "practice_mode",
    name: "AI Practice Mode",
    hook: "Rehearse with your research.",
    description: "AI personas built from your blitz intel. Prospect calls, interviews & panels. Scored on 8 messaging dimensions.",
    minimumTier: "pro",
  },
  {
    id: "prospect_outreach",
    name: "Prospect Outreach",
    hook: "Get the meeting. Cold.",
    description: "Research-backed sequences that earn replies from people who don't know you yet. Every touchpoint references their pain, not your pitch.",
    minimumTier: "launch",
  },
  {
    id: "prospect_prep",
    name: "Prospect Prep",
    hook: "Own the conversation.",
    description: "Org chart, pain points, competitive positioning & talk tracks. Methodology-structured, deal-qualified.",
    minimumTier: "pro",
  },
  {
    id: "deal_audit",
    name: "Deal Audit",
    hook: "Stress-test your deal.",
    description: "Qualification scorecard, risk flags & strategy to close the gaps. No hiding from reality.",
    minimumTier: "closer",
  },
  {
    id: "champion_builder",
    name: "Champion Builder",
    hook: "Equip your champion.",
    description: "Stakeholder maps, internal selling kits & competitive talking points so your champion sells when you're not in the room.",
    minimumTier: "closer",
  },
  {
    id: "territory_blitz",
    name: "Territory Blitz",
    hook: "Map your entire territory.",
    description: "Upload a target list, get research & outreach for every account in one blitz. Territory prep in hours, not weeks.",
    minimumTier: "closer",
  },
  {
    id: "win_loss_analyst",
    name: "Win/Loss Analyst",
    hook: "Learn from every deal.",
    description: "Pattern analysis across closed deals. Methodology gaps, coaching recs & themes you keep missing. See the intelligence section below.",
    minimumTier: "closer",
  },
];

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingDepth, setOnboardingDepth] = useState(0);
  const [profileChecked, setProfileChecked] = useState(false);

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
        if (data.profile?.onboardingCompleted) setOnboardingComplete(true);
        const depth = data.profile?.onboardingDepth ?? 0;
        setOnboardingDepth(depth);
        // Auto-open onboarding chat for brand new users (depth 0)
        if (depth === 0 && !data.profile?.onboardingCompleted) {
          setChatOpen(true);
        }
      }
    } catch {}
    setProfileChecked(true);
  }

  async function fetchRequests() {
    try {
      const res = await fetch("/api/requests");
      if (res.ok) {
        const data = await res.json();
        const requests = data.requests || [];
        const active = requests.filter(
          (r: { status: string }) => r.status === "submitted" || r.status === "in_progress" || r.status === "ready"
        );
        setPendingRequests(active.length);
        setRecentRequests(
          requests.slice(0, 10).map((r: RecentRequest) => ({
            id: r.id,
            toolName: r.toolName,
            targetName: r.targetName,
            targetCompany: r.targetCompany,
            createdAt: r.createdAt,
            status: r.status,
          }))
        );
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
    } else if (toolId === "territory_blitz") {
      window.location.href = `/batch`;
    } else if (toolId === "win_loss_analyst") {
      // Scroll to the Win/Loss Intelligence section on this page
      const el = document.getElementById("win-loss-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const hasSubscription = userData?.subscriptionStatus === "active" && userData?.currentTier;
  const isMaxTier = userData?.currentTier === "closer";
  const firstName = clerkUser?.firstName || "there";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav
        currentPage="/dashboard"
        pendingRequests={pendingRequests}
        hasSubscription={!!hasSubscription}
        isMaxTier={isMaxTier}
        onManageBilling={handleManageBilling}
        tierBadge={hasSubscription && userData?.currentTier ? TIER_NAMES[userData.currentTier] : undefined}
        hasPriority={userData?.priorityProcessing}
      />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="text-gray-500 mt-1">Pick a tool, name your target, own the conversation.</p>
        </div>

        {/* Pending requests banner */}
        {pendingRequests > 0 && (
          <a
            href="/requests"
            className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 transition hover:bg-emerald-500/15"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-black text-sm font-bold">
                {pendingRequests}
              </div>
              <span className="text-sm font-medium text-emerald-300">
                {pendingRequests === 1 ? "Blitz in progress" : `${pendingRequests} blitzes in progress`}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-emerald-500" />
          </a>
        )}

        {/* Run Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Total Available */}
          <div className="rounded-xl border-2 border-emerald-500/30 bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Blitzes Available</span>
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="mt-1 text-3xl font-extrabold text-white">{totalAvailableRuns()}</p>
            {totalAvailableRuns() === 0 ? (
              <a
                href="/subscribe#packs"
                className="mt-2 inline-flex items-center text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                Get more blitzes <ChevronRight className="ml-0.5 h-3 w-3" />
              </a>
            ) : (
              <p className="mt-2 text-xs text-gray-600">
                {hasSubscription && userData!.currentPeriodEnd
                  ? `Resets ${new Date(userData!.currentPeriodEnd).toLocaleDateString()}`
                  : "Use on any tool below"}
              </p>
            )}
          </div>

          {/* Subscription */}
          <div className="rounded-xl border border-[#262626] bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Subscription</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-white">
              {hasSubscription ? userData!.subscriptionRunsRemaining : 0}
              <span className="text-base font-normal text-gray-600">
                /{hasSubscription ? userData!.subscriptionRunsTotal : 0}
              </span>
            </p>
            {hasSubscription && userData!.subscriptionRunsTotal > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-[#262626]">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${(userData!.subscriptionRunsRemaining / userData!.subscriptionRunsTotal) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Packs */}
          <div className="rounded-xl border border-[#262626] bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Packs</span>
              <Package className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-white">
              {userData?.runPacks
                .filter((p: { type: string }) => p.type !== "interview_sprint")
                .reduce((sum: number, p: { runsRemaining: number }) => sum + p.runsRemaining, 0) || 0}
            </p>
          </div>

          {/* Sprint */}
          <div className="rounded-xl border border-[#262626] bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Sprint</span>
              <Clock className="h-3.5 w-3.5 text-orange-400" />
            </div>
            <p className="mt-1 text-2xl font-bold text-white">
              {userData?.runPacks
                .filter((p: { type: string }) => p.type === "interview_sprint")
                .reduce((sum: number, p: { runsRemaining: number }) => sum + p.runsRemaining, 0) || 0}
            </p>
          </div>
        </div>

        {/* AI Profile Setup — Full welcome for depth 0, progressive banner for 1-3 */}
        {onboardingDepth === 0 && profileChecked && (
          <div className="mb-10 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#141414] to-[#141414] p-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">3 minutes to personalized AI</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">
                Tell us your company. We do the rest.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Drop your company name and we auto-research your product, competitors, ICP, and case studies. Upload a resume and we extract your deal stories. Every blitz, practice session, and asset gets built from YOUR context, not templates.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setChatOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-black hover:bg-emerald-400 transition hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                >
                  <Sparkles className="h-4 w-4" />
                  Start Setup
                </button>
                <a href="/profile" className="text-sm text-gray-500 hover:text-gray-300 transition">
                  or fill in manually
                </a>
              </div>
              <div className="flex items-center gap-6 mt-6 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/60" /> Auto-researches your company</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/60" /> Extracts deal stories from resume</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/60" /> Prescribes methodology</span>
              </div>
            </div>
          </div>
        )}
        {onboardingDepth > 0 && onboardingDepth < 4 && (
          <div className="mb-8 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-[#141414] p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {onboardingDepth === 1 && "Deepen your profile"}
                    {onboardingDepth === 2 && "Add territory & career context"}
                    {onboardingDepth === 3 && "Dial in your writing voice"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {onboardingDepth === 1 && "Add deal stories & methodology to sharpen your output. Takes ~5 min."}
                    {onboardingDepth === 2 && "Add ICP definitions, territory focus, and career context. Takes ~5 min."}
                    {onboardingDepth === 3 && "Final layer: writing style, banned phrases, signature patterns."}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 w-10 rounded-full ${
                          level <= onboardingDepth ? "bg-emerald-500" : "bg-[#262626]"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">{onboardingDepth}/4</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a href="/profile" className="text-xs text-gray-500 hover:text-gray-300 transition whitespace-nowrap">
                  Manual setup
                </a>
                <button
                  onClick={() => setChatOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] whitespace-nowrap"
                >
                  <Sparkles className="h-4 w-4" />
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sample Run Banner */}
        {userData && recentRequests.length === 0 && (
          <div className="mb-8 rounded-xl border border-[#262626] bg-[#141414] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e1e1e] border border-[#333]">
                  <Eye className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">See a sample blitz</h3>
                  <p className="text-sm text-gray-500">Preview a completed Prospect Prep package.</p>
                </div>
              </div>
              <a
                href="/demo/prospect_prep"
                className="flex items-center gap-2 rounded-full border border-[#333] bg-[#1e1e1e] px-4 py-2 text-sm font-medium text-gray-300 hover:border-emerald-500/30 hover:text-emerald-400 transition whitespace-nowrap"
              >
                <Eye className="h-4 w-4" />
                View Demo
              </a>
            </div>
          </div>
        )}

        {/* Quick Start — 2 primary modes */}
        <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Start a Blitz</h2>
        <div className={`relative grid grid-cols-1 gap-4 md:grid-cols-2 mb-10 ${onboardingDepth === 0 ? "pointer-events-none" : ""}`}>
          {onboardingDepth === 0 && profileChecked && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-[#0a0a0a]/70 backdrop-blur-[2px]">
              <div className="text-center">
                <Lock className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-400">Complete your profile to unlock blitzes</p>
                <button
                  onClick={() => setChatOpen(true)}
                  className="pointer-events-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 transition"
                >
                  <Sparkles className="h-3 w-3" /> Setup Profile
                </button>
              </div>
            </div>
          )}

          {/* Prep for a Meeting */}
          <button
            onClick={() => { window.location.href = "/request?mode=meeting"; }}
            disabled={totalAvailableRuns() === 0}
            className="group relative flex flex-col rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-[#141414] to-[#141414] p-6 text-left transition hover:border-emerald-500/40 hover:shadow-[0_0_32px_rgba(16,185,129,0.12)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Prep for a meeting</h3>
                <p className="text-xs text-gray-500">Discovery, pitch, follow-up, or closing</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Research the account, build talk tracks, and get a methodology-structured game plan. Outreach sequences included if you need to get the meeting first.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition">
              <Zap className="h-3.5 w-3.5" /> Start Blitz
            </div>
          </button>

          {/* Prep for an Interview */}
          <button
            onClick={() => { window.location.href = "/request?mode=interview"; }}
            disabled={totalAvailableRuns() === 0}
            className="group relative flex flex-col rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-[#141414] to-[#141414] p-6 text-left transition hover:border-emerald-500/40 hover:shadow-[0_0_32px_rgba(16,185,129,0.12)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                <Briefcase className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Prep for an interview</h3>
                <p className="text-xs text-gray-500">Any round, any stage, any interviewer</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Deep company intel, POV deck, speaker notes per panelist, and talk tracks. Need to land the interview first? We build that outreach too.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition">
              <Zap className="h-3.5 w-3.5" /> Start Blitz
            </div>
          </button>
        </div>

        {/* Advanced Tools */}
        <details className="mb-10 group">
          <summary className="mb-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition list-none">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            All Tools
          </summary>
        <div className={`relative grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 ${onboardingDepth === 0 ? "pointer-events-none" : ""}`}>
          {TOOLS.map((tool) => {
            const accessible = !tool.comingSoon && (canAccess(tool.minimumTier) || hasSprintAccess(tool.id));

            return (
              <div
                key={tool.id}
                className={`relative flex flex-col rounded-xl border bg-[#141414] p-5 transition ${
                  tool.comingSoon
                    ? "border-[#1e1e1e] opacity-50"
                    : accessible
                    ? "border-[#262626] hover:border-emerald-500/30 hover:bg-[#1a1a1a]"
                    : "border-[#1e1e1e] opacity-70"
                }`}
              >
                {/* Coming Soon overlay */}
                {tool.comingSoon && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#0a0a0a]/60 backdrop-blur-[1px]">
                    <span className="rounded-full bg-[#262626] border border-[#333] px-3 py-1 text-[10px] font-semibold text-gray-400 tracking-wide uppercase">
                      Coming Soon
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-white">{tool.name}</h3>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const toolCount = recentRequests.filter((r) => r.toolName === tool.id).length;
                      return toolCount > 0 ? (
                        <span className="text-xs text-gray-600">{toolCount} run{toolCount !== 1 ? "s" : ""}</span>
                      ) : null;
                    })()}
                    {!accessible && !tool.comingSoon && <Lock className="h-4 w-4 text-gray-600" />}
                  </div>
                </div>
                <p className="mt-2 flex-1 text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-300">{tool.hook}</span>{" "}
                  {tool.description}
                </p>

                <div className="mt-4">
                  {tool.comingSoon ? (
                    <div className="w-full rounded-lg border border-[#262626] bg-[#1a1a1a] px-3 py-2 text-xs font-medium text-gray-600 text-center">
                      Coming Soon
                    </div>
                  ) : accessible ? (
                    <button
                      onClick={() => handleRunTool(tool.id)}
                      disabled={totalAvailableRuns() === 0}
                      className="w-full rounded-lg bg-emerald-500 px-3 py-2.5 text-xs font-semibold text-black transition hover:bg-emerald-400 hover:shadow-[0_0_16px_rgba(16,185,129,0.25)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {totalAvailableRuns() === 0 ? (
                        "No Blitzes Remaining"
                      ) : (
                        <>
                          <Zap className="h-3 w-3" /> New Blitz
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href="/subscribe"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/15"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Unlock with {TIER_NAMES[tool.minimumTier]}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </details>

        {/* Recent Blitzes */}
        {recentRequests.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Recent Blitzes</h2>
              <a href="/requests" className="text-sm text-emerald-400 hover:text-emerald-300 transition">
                View all
              </a>
            </div>
            <div className="rounded-xl border border-[#262626] bg-[#141414] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-[#262626] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Tool</th>
                    <th className="px-6 py-3">Target</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e]">
                  {recentRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-[#1a1a1a] cursor-pointer transition"
                      onClick={() => (window.location.href = `/requests/${req.id}`)}
                    >
                      <td className="px-6 py-3 font-medium text-white">
                        {TOOL_NAMES[req.toolName] || req.toolName}
                      </td>
                      <td className="px-6 py-3 text-gray-400">
                        {req.targetName && req.targetCompany
                          ? `${req.targetName} @ ${req.targetCompany}`
                          : req.targetCompany || req.targetName || "\u2014"}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        {req.status === "completed" || req.status === "delivered" || req.status === "ready" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Done
                          </span>
                        ) : req.status === "failed" ? (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                            <XCircle className="h-3.5 w-3.5" /> Failed
                          </span>
                        ) : req.status === "awaiting_clarification" ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
                            <AlertCircle className="h-3.5 w-3.5" /> Needs Input
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-400 text-xs font-medium">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {(req.status === "completed" || req.status === "delivered" || req.status === "ready") &&
                        req.toolName !== "competitor_research" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const params = new URLSearchParams();
                              params.set("autostart", "true");
                              if (req.targetCompany) params.set("company", req.targetCompany);
                              if (req.id) params.set("runRequestId", req.id);
                              window.location.href = `/practice?${params.toString()}`;
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition"
                          >
                            <Play className="h-3 w-3" />
                            Practice
                          </button>
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Meeting Recordings */}
        <div className="mb-10">
          <MeetingRecordings limit={5} />
        </div>

        {/* Win/Loss Intelligence */}
        <div id="win-loss-section" className="mb-10">
          <WinLossIntelligence />
        </div>

        {/* Consulting CTA */}
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-[#141414] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">We run the playbook. You take the meetings.</h3>
                <p className="mt-1 text-sm text-gray-400">
                  We operate Sales Blitz on your behalf. Research, sequences & meeting-ready packages for your top accounts.
                </p>
              </div>
            </div>
            <a
              href="mailto:evan@salesblitz.ai?subject=Done-For-You%20Sales%20-%20Let's%20Talk"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <Mail className="h-4 w-4" />
              Talk to Us
            </a>
          </div>
        </div>
      </main>

      {/* Floating AI chat */}
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
