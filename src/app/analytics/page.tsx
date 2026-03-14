"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TOOL_LABELS } from "@/lib/tool-display";
import {
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  Users,
  Building2,
  Loader2,
  ArrowRight,
  Activity,
} from "lucide-react";
import AppNav from "@/components/AppNav";

interface AnalyticsData {
  range: number;
  totalRuns: number;
  avgCompletionMinutes: number | null;
  runsByTool: { tool: string; count: number }[];
  runsByStatus: { status: string; count: number }[];
  dailyRuns: { date: string; count: number }[];
  topCompanies: { company: string; count: number }[];
  recentRequests: {
    id: string;
    tool: string;
    status: string;
    target: string;
    createdAt: string;
    completedAt: string | null;
    priority: boolean;
    userName: string;
  }[];
  memberBreakdown: { name: string; email: string; runCount: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  delivered: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  researching: "bg-blue-500/15 text-blue-400",
  generating: "bg-emerald-500/15 text-emerald-400",
  submitted: "bg-[#1a1a1a] text-neutral-200",
  failed: "bg-red-500/15 text-red-400",
  in_progress: "bg-blue-500/15 text-blue-400",
};

export default function AnalyticsPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    if (isLoaded && clerkUser) fetchAnalytics();
  }, [isLoaded, clerkUser, range, teamId]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: range.toString() });
      if (teamId) params.set("teamId", teamId);
      const res = await fetch(`/api/analytics?${params}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      console.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-neutral-400">Failed to load analytics</p>
      </div>
    );
  }

  const maxDaily = Math.max(...data.dailyRuns.map((d) => d.count), 1);
  const completedCount = data.runsByStatus.find((s) => s.status === "completed" || s.status === "delivered")?.count || 0;
  const failedCount = data.runsByStatus.find((s) => s.status === "failed")?.count || 0;
  const successRate = data.totalRuns > 0 ? Math.round((completedCount / data.totalRuns) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav currentPage="/analytics" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Range Selector */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Usage Analytics</h1>
          <div className="flex gap-2">
            {[7, 30, 90].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  range === r
                    ? "bg-emerald-600 text-white"
                    : "bg-[#141414] text-neutral-300 border border-[#333333] hover:bg-[#0a0a0a]"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-[#141414] p-5 shadow-sm shadow-black/20">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Zap className="h-4 w-4" />
              Total Runs
            </div>
            <p className="mt-2 text-3xl font-bold text-white">{data.totalRuns}</p>
            <p className="mt-1 text-xs text-neutral-500">Last {range} days</p>
          </div>

          <div className="rounded-xl border bg-[#141414] p-5 shadow-sm shadow-black/20">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Clock className="h-4 w-4" />
              Avg Completion
            </div>
            <p className="mt-2 text-3xl font-bold text-white">
              {data.avgCompletionMinutes !== null ? `${data.avgCompletionMinutes}m` : "N/A"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Minutes per run</p>
          </div>

          <div className="rounded-xl border bg-[#141414] p-5 shadow-sm shadow-black/20">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <TrendingUp className="h-4 w-4" />
              Success Rate
            </div>
            <p className="mt-2 text-3xl font-bold text-white">{successRate}%</p>
            <p className="mt-1 text-xs text-neutral-500">
              {completedCount} completed, {failedCount} failed
            </p>
          </div>

          <div className="rounded-xl border bg-[#141414] p-5 shadow-sm shadow-black/20">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Building2 className="h-4 w-4" />
              Companies Researched
            </div>
            <p className="mt-2 text-3xl font-bold text-white">{data.topCompanies.length}</p>
            <p className="mt-1 text-xs text-neutral-500">Unique targets</p>
          </div>
        </div>

        {/* Daily Usage Chart */}
        {data.dailyRuns.length > 0 && (
          <div className="mb-8 rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <h2 className="mb-4 text-lg font-semibold text-white">Daily Usage</h2>
            <div className="flex items-end gap-1" style={{ height: "120px" }}>
              {data.dailyRuns.map((day) => (
                <div
                  key={day.date}
                  className="group relative flex-1 min-w-[4px]"
                  style={{ height: "100%" }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-emerald-500/100 transition hover:bg-emerald-600"
                    style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: "2px" }}
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded bg-[#141414] px-2 py-1 text-xs text-white">
                    {day.date}: {day.count} run{day.count !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-neutral-500">
              <span>{data.dailyRuns[0]?.date}</span>
              <span>{data.dailyRuns[data.dailyRuns.length - 1]?.date}</span>
            </div>
          </div>
        )}

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Runs by Tool */}
          <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <h2 className="mb-4 text-lg font-semibold text-white">Blitzes by Tool</h2>
            {data.runsByTool.length === 0 ? (
              <p className="text-sm text-neutral-500">No blitzes yet</p>
            ) : (
              <div className="space-y-3">
                {data.runsByTool.map((t) => (
                  <div key={t.tool}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-neutral-200">
                        {TOOL_LABELS[t.tool] || t.tool}
                      </span>
                      <span className="text-neutral-400">{t.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#1a1a1a]">
                      <div
                        className="h-2 rounded-full bg-emerald-500/100"
                        style={{
                          width: `${(t.count / (data.runsByTool[0]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Companies */}
          <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <h2 className="mb-4 text-lg font-semibold text-white">Top Target Companies</h2>
            {data.topCompanies.length === 0 ? (
              <p className="text-sm text-neutral-500">No companies yet</p>
            ) : (
              <div className="space-y-3">
                {data.topCompanies.map((c, i) => (
                  <div key={c.company} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-medium text-neutral-300">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-neutral-200">{c.company}</span>
                    </div>
                    <span className="text-sm text-neutral-400">{c.count} blitz{c.count !== 1 ? "es" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Member Breakdown (if team) */}
        {teamId && data.memberBreakdown.length > 0 && (
          <div className="mb-8 rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Users className="h-5 w-5" />
              Team Member Usage
            </h2>
            <div className="space-y-3">
              {data.memberBreakdown.map((m) => (
                <div key={m.email} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{m.name}</p>
                    <p className="text-xs text-neutral-500">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-[#1a1a1a]">
                      <div
                        className="h-2 rounded-full bg-emerald-500/100"
                        style={{
                          width: `${(m.runCount / (data.memberBreakdown[0]?.runCount || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="min-w-[3rem] text-right text-sm text-neutral-400">
                      {m.runCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Requests */}
        <div className="rounded-xl border bg-[#141414] shadow-sm shadow-black/20">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Recent Runs</h2>
            <Link
              href="/requests"
              className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-400"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.recentRequests.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500">
              No blitzes in the last {range} days
            </div>
          ) : (
            <div className="divide-y">
              {data.recentRequests.map((r) => (
                <Link
                  key={r.id}
                  href={`/requests/${r.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-[#0a0a0a] transition"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-neutral-500" />
                    <div>
                      <p className="text-sm font-medium text-neutral-200">{r.target}</p>
                      <p className="text-xs text-neutral-500">
                        {TOOL_LABELS[r.tool] || r.tool}
                        {teamId && ` by ${r.userName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[r.status] || "bg-[#1a1a1a] text-neutral-200"
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
