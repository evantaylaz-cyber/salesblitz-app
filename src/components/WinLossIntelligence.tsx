"use client";

import React, { useState, useEffect } from "react";
import { TOOL_LABELS } from "@/lib/tool-display";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Trophy,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DimensionScore {
  dimension: string;
  wonAvg: number | null;
  lostAvg: number | null;
  delta: number | null;
}

interface WinLossData {
  totalTargets: number;
  wonCount: number;
  lostCount: number;
  activeCount: number;
  winRate: number | null;
  avgRoundsWon: number | null;
  avgRoundsLost: number | null;
  toolBreakdown: Array<{
    tool: string;
    wonCount: number;
    lostCount: number;
    winRate: number | null;
  }>;
  topObjectionsLost: Array<{
    objection: string;
    count: number;
    effectiveness: Record<string, number>;
  }>;
  topGapsLost: Array<{ gap: string; count: number }>;
  topStrengthsWon: Array<{ strength: string; count: number }>;
  dimensionScores: DimensionScore[];
  recentOutcomes: Array<{
    targetId: string;
    companyName: string;
    status: string;
    roundCount: number;
    blitzCount: number;
    updatedAt: string;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  overall: "Overall",
  beforeState: "Before State",
  negativeConsequences: "Negative Consequences",
  requiredCapabilities: "Required Capabilities",
  pbos: "Positive Business Outcomes",
  howWeDoIt: "How We Do It",
};

function formatPercent(n: number | null): string {
  if (n === null) return "--";
  return `${Math.round(n * 100)}%`;
}

function formatScore(n: number | null): string {
  if (n === null) return "--";
  return n.toFixed(1);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function WinLossIntelligence() {
  const [data, setData] = useState<WinLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics/win-loss");
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-zinc-800 bg-[#141414] p-6">
        <div className="h-5 w-40 rounded bg-zinc-800 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  // Don't render if no closed deals
  const closedCount = data.wonCount + data.lostCount;
  if (closedCount === 0 && data.totalTargets < 2) return null;

  const hasOutcomeData = closedCount > 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#141414] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
            <BarChart3 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">Win/Loss Intelligence</h3>
            <p className="text-xs text-zinc-500">
              {hasOutcomeData
                ? `${formatPercent(data.winRate)} win rate across ${closedCount} closed deal${closedCount !== 1 ? "s" : ""}`
                : `${data.totalTargets} target${data.totalTargets !== 1 ? "s" : ""} tracked, mark as won/lost to unlock patterns`}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Win Rate"
              value={formatPercent(data.winRate)}
              icon={<Trophy className="h-3.5 w-3.5 text-emerald-400" />}
              accent={data.winRate !== null && data.winRate >= 0.5 ? "emerald" : "amber"}
            />
            <StatCard
              label="Wins"
              value={String(data.wonCount)}
              icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
              accent="emerald"
            />
            <StatCard
              label="Losses"
              value={String(data.lostCount)}
              icon={<TrendingDown className="h-3.5 w-3.5 text-red-400" />}
              accent="red"
            />
            <StatCard
              label="Active"
              value={String(data.activeCount)}
              icon={<Target className="h-3.5 w-3.5 text-blue-400" />}
              accent="blue"
            />
          </div>

          {/* Rounds to close */}
          {(data.avgRoundsWon !== null || data.avgRoundsLost !== null) && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Rounds to Close
              </h4>
              <div className="flex items-center gap-8">
                {data.avgRoundsWon !== null && (
                  <div>
                    <span className="text-2xl font-bold text-emerald-400">
                      {data.avgRoundsWon.toFixed(1)}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">avg rounds (wins)</span>
                  </div>
                )}
                {data.avgRoundsLost !== null && (
                  <div>
                    <span className="text-2xl font-bold text-red-400">
                      {data.avgRoundsLost.toFixed(1)}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">avg rounds (losses)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messaging Dimensions: Won vs Lost */}
          {data.dimensionScores.some((d) => d.wonAvg !== null || d.lostAvg !== null) && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Messaging Dimensions (Practice Scores)
              </h4>
              <div className="space-y-2">
                {data.dimensionScores
                  .filter((d) => d.wonAvg !== null || d.lostAvg !== null)
                  .map((d) => (
                    <DimensionBar key={d.dimension} dim={d} />
                  ))}
              </div>
            </div>
          )}

          {/* Objections that killed deals */}
          {data.topObjectionsLost.length > 0 && (
            <div className="rounded-lg border border-red-900/30 bg-red-900/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  Objections in Lost Deals
                </h4>
              </div>
              <div className="space-y-2">
                {data.topObjectionsLost.slice(0, 5).map((obj, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 text-xs font-mono text-red-400/60">{obj.count}x</span>
                    <span className="text-sm text-zinc-300">{obj.objection}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Qualification gaps in lost deals */}
          {data.topGapsLost.length > 0 && (
            <div className="rounded-lg border border-amber-900/30 bg-amber-900/10 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
                Qualification Gaps (Lost Deals)
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.topGapsLost.slice(0, 8).map((g, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 px-2.5 py-1 text-xs text-amber-300"
                  >
                    {g.gap}
                    {g.count > 1 && (
                      <span className="text-amber-500 font-mono">({g.count})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strengths in won deals */}
          {data.topStrengthsWon.length > 0 && (
            <div className="rounded-lg border border-emerald-900/30 bg-emerald-900/10 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3">
                Winning Patterns
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.topStrengthsWon.slice(0, 8).map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-2.5 py-1 text-xs text-emerald-300"
                  >
                    {s.strength}
                    {s.count > 1 && (
                      <span className="text-emerald-500 font-mono">({s.count})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tool performance by outcome */}
          {data.toolBreakdown.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Tool Performance
              </h4>
              <div className="space-y-2">
                {data.toolBreakdown.map((t) => (
                  <div
                    key={t.tool}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-zinc-300">
                      {TOOL_LABELS[t.tool] || t.tool}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 text-xs font-mono">
                        {t.wonCount}W
                      </span>
                      <span className="text-red-400 text-xs font-mono">
                        {t.lostCount}L
                      </span>
                      <span className="text-zinc-500 text-xs w-10 text-right">
                        {formatPercent(t.winRate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent outcomes */}
          {data.recentOutcomes.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Recent Outcomes
              </h4>
              <div className="space-y-2">
                {data.recentOutcomes.map((o) => (
                  <a
                    key={o.targetId}
                    href={`/targets/${o.targetId}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          o.status === "won"
                            ? "bg-emerald-900/50 text-emerald-300"
                            : "bg-red-900/50 text-red-300"
                        }`}
                      >
                        {o.status === "won" ? "W" : "L"}
                      </span>
                      <span className="text-sm text-zinc-200">{o.companyName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{o.roundCount} round{o.roundCount !== 1 ? "s" : ""}</span>
                      <span>{o.blitzCount} blitz{o.blitzCount !== 1 ? "es" : ""}</span>
                      <span>
                        {new Date(o.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Empty state nudge */}
          {!hasOutcomeData && (
            <div className="rounded-lg border border-dashed border-zinc-700 p-6 text-center">
              <p className="text-sm text-zinc-400 mb-2">
                Mark targets as <strong className="text-emerald-400">won</strong> or{" "}
                <strong className="text-red-400">lost</strong> to unlock pattern analysis.
              </p>
              <p className="text-xs text-zinc-600">
                Go to any target page and update its status. The more outcomes you track, the smarter this gets.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "emerald" | "amber" | "red" | "blue";
}) {
  const borderColors: Record<string, string> = {
    emerald: "border-emerald-500/20",
    amber: "border-amber-500/20",
    red: "border-red-500/20",
    blue: "border-blue-500/20",
  };

  return (
    <div className={`rounded-lg border ${borderColors[accent]} bg-zinc-900/50 p-3`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        {icon}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function DimensionBar({ dim }: { dim: DimensionScore }) {
  const label = DIMENSION_LABELS[dim.dimension] || dim.dimension;
  const maxVal = 5;

  return (
    <div className="flex items-center gap-3">
      <span className="w-40 text-xs text-zinc-400 truncate">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        {/* Won bar */}
        <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
          {dim.wonAvg !== null && (
            <div
              className="h-full rounded-full bg-emerald-500/70"
              style={{ width: `${(dim.wonAvg / maxVal) * 100}%` }}
            />
          )}
        </div>
        <span className="w-8 text-right text-xs font-mono text-emerald-400">
          {formatScore(dim.wonAvg)}
        </span>
        {/* Lost bar */}
        <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
          {dim.lostAvg !== null && (
            <div
              className="h-full rounded-full bg-red-500/70"
              style={{ width: `${(dim.lostAvg / maxVal) * 100}%` }}
            />
          )}
        </div>
        <span className="w-8 text-right text-xs font-mono text-red-400">
          {formatScore(dim.lostAvg)}
        </span>
      </div>
      {/* Delta */}
      {dim.delta !== null && (
        <span
          className={`w-10 text-right text-xs font-mono ${
            dim.delta > 0 ? "text-emerald-400" : dim.delta < 0 ? "text-red-400" : "text-zinc-500"
          }`}
        >
          {dim.delta > 0 ? "+" : ""}
          {dim.delta}
        </span>
      )}
    </div>
  );
}
