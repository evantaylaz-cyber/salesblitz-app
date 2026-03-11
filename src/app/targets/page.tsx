"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Target,
  Building2,
  User,
  Zap,
  Brain,
  TrendingUp,
  Clock,
  ChevronRight,
  Loader2,
  Briefcase,
  GraduationCap,
  MessageSquare,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import Link from "next/link";
import dynamic from "next/dynamic";

const OnboardingChatBubble = dynamic(
  () => import("@/components/OnboardingChatBubble"),
  { ssr: false }
);

interface TargetData {
  id: string;
  companyName: string;
  contactName: string | null;
  contactTitle: string | null;
  type: "prospect" | "interview";
  status: string;
  roundCount: number;
  intelDepth: "none" | "light" | "moderate" | "deep";
  intelPreview: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    blitzes: number;
    practices: number;
    debriefs: number;
  };
  recentBlitzes: {
    id: string;
    toolName: string;
    status: string;
    createdAt: string;
  }[];
  recentPractice: {
    id: string;
    outcome: string | null;
    cotmScore: any;
    completedAt: string | null;
  }[];
}

const INTEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  none: { bg: "bg-[#1a1a1a]", text: "text-neutral-500", label: "No Intel" },
  light: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Light" },
  moderate: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Growing" },
  deep: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Deep" },
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400",
  paused: "text-amber-400",
  closed: "text-neutral-500",
  won: "text-emerald-400",
  lost: "text-red-500",
};

const TOOL_LABELS: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  prospect_outreach: "Prospect Outreach",
  interview_prep: "Interview Prep",
  prospect_prep: "Prospect Prep",
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function TargetsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "prospect" | "interview">("all");

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/targets")
      .then((res) => res.json())
      .then((data) => {
        setTargets(data.targets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoaded, user]);

  const filtered = filter === "all" ? targets : targets.filter((t) => t.type === filter);

  const totalBlitzes = targets.reduce((sum, t) => sum + t.counts.blitzes, 0);
  const totalPractice = targets.reduce((sum, t) => sum + t.counts.practices, 0);
  const deepTargets = targets.filter((t) => t.intelDepth === "deep" || t.intelDepth === "moderate").length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav />
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="h-6 w-6 text-emerald-400" />
              Territory Intelligence
            </h1>
            <p className="text-neutral-400 mt-1">
              Every blitz, debrief, and practice session compounds here.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border bg-[#141414] p-4 shadow-sm shadow-black/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">Active Targets</span>
              <Target className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{targets.length}</p>
          </div>
          <div className="rounded-lg border bg-[#141414] p-4 shadow-sm shadow-black/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">Total Blitzes</span>
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{totalBlitzes}</p>
          </div>
          <div className="rounded-lg border bg-[#141414] p-4 shadow-sm shadow-black/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">Practice Sessions</span>
              <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{totalPractice}</p>
          </div>
          <div className="rounded-lg border bg-[#141414] p-4 shadow-sm shadow-black/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">Deep Intel Targets</span>
              <Brain className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{deepTargets}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "prospect", "interview"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-[#141414] text-neutral-400 border border-[#262626] hover:border-[#333333]"
              }`}
            >
              {f === "all" ? "All" : f === "prospect" ? "Prospects" : "Interviews"}
              <span className="ml-1.5 text-xs opacity-60">
                ({f === "all" ? targets.length : targets.filter((t) => t.type === f).length})
              </span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        )}

        {/* Empty State */}
        {!loading && targets.length === 0 && (
          <div className="text-center py-20">
            <Target className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-neutral-300 mb-2">No targets yet</h2>
            <p className="text-neutral-500 mb-6 max-w-md mx-auto">
              Targets are created automatically when you run a blitz or start a practice session.
              Each target accumulates intelligence across rounds.
            </p>
            <Link
              href="/request"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Zap className="h-4 w-4" />
              Run Your First Blitz
            </Link>
          </div>
        )}

        {/* Target Cards */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((target) => {
              const intel = INTEL_COLORS[target.intelDepth];
              const statusColor = STATUS_COLORS[target.status] || "text-neutral-500";
              const TypeIcon = target.type === "interview" ? GraduationCap : Briefcase;

              return (
                <div
                  key={target.id}
                  onClick={() => router.push(`/targets/${target.id}`)}
                  className="cursor-pointer rounded-xl border bg-[#141414] p-5 shadow-sm shadow-black/20 hover:shadow-md hover:border-[#333333] transition-all"
                >
                  {/* Top Row: Company + Intel Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#1a1a1a] rounded-lg">
                        <Building2 className="h-5 w-5 text-neutral-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{target.companyName}</h3>
                          <TypeIcon className="h-4 w-4 text-neutral-500" />
                          <span className={`text-xs capitalize ${statusColor}`}>{target.status}</span>
                        </div>
                        {target.contactName && (
                          <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                            <User className="h-3.5 w-3.5" />
                            {target.contactName}
                            {target.contactTitle && <span className="text-neutral-500">, {target.contactTitle}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Intel Depth Badge */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${intel.bg} ${intel.text}`}>
                      <Brain className="h-3.5 w-3.5" />
                      {intel.label}
                      {target.roundCount > 0 && (
                        <span className="opacity-60">
                          R{target.roundCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Activity Counts */}
                  <div className="flex gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      <Zap className="h-3.5 w-3.5" />
                      <span>{target.counts.blitzes} blitz{target.counts.blitzes !== 1 ? "es" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{target.counts.debriefs} debrief{target.counts.debriefs !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>{target.counts.practices} practice</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-500 ml-auto">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{timeAgo(target.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Intel Preview */}
                  {target.intelPreview && (
                    <div className="bg-[#0a0a0a] rounded-lg p-3 mb-3 text-xs text-neutral-400 font-mono leading-relaxed border border-[#1a1a1a]">
                      {target.intelPreview}
                      {target.intelPreview.length >= 200 && "..."}
                    </div>
                  )}

                  {/* Recent Activity Timeline */}
                  {target.recentBlitzes.length > 0 && (
                    <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      {target.recentBlitzes.map((blitz) => (
                        <Link
                          key={blitz.id}
                          href={`/requests/${blitz.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#262626] rounded-md text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                        >
                          <Zap className="h-3 w-3 text-emerald-500" />
                          {TOOL_LABELS[blitz.toolName] || blitz.toolName}
                          <span className="text-neutral-500">{timeAgo(blitz.createdAt)}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <OnboardingChatBubble />
    </div>
  );
}
