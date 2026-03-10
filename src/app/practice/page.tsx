"use client";

import { useState, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Video,
  Loader2,
  Clock,
  Target,
  TrendingUp,
  Play,
  ChevronRight,
  Zap,
  Plus,
} from "lucide-react";
import AppNav from "@/components/AppNav";

interface BlitzRun {
  id: string;
  toolName: string;
  targetCompany: string;
  targetName: string;
  targetRole: string | null;
  status: string;
  createdAt: string;
}

const TOOL_LABELS: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  prospect_outreach: "Prospect Outreach",
  interview_prep: "Interview Prep",
  prospect_prep: "Prospect Prep",
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
};

// Map blitz tool to the practice scenario it creates
const SCENARIO_LABELS: Record<string, string> = {
  interview_outreach: "Interview Practice",
  interview_prep: "Interview Practice",
  prospect_outreach: "Discovery Call",
  prospect_prep: "Discovery Call",
  deal_audit: "Deal Review Call",
  champion_builder: "Champion Call",
};

function inferMeetingType(toolName: string): string {
  if (toolName.startsWith("interview_")) return "interview";
  if (toolName === "deal_audit") return "follow_up";
  return "discovery";
}

interface PastSession {
  id: string;
  targetCompany: string;
  personaName: string;
  targetRole: string;
  outcome: string | null;
  durationSeconds: number | null;
  cotmScore: { overall: number } | null;
  createdAt: string;
  status: string;
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div>}>
      <PracticeLanding />
    </Suspense>
  );
}

function PracticeLanding() {
  const { isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [targetCompany, setTargetCompany] = useState("");
  const [meetingType, setMeetingType] = useState("discovery");
  const [starting, setStarting] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [blitzRuns, setBlitzRuns] = useState<BlitzRun[]>([]);
  const [usage, setUsage] = useState<{ used: number; tier: string | null }>({ used: 0, tier: null });
  const [loading, setLoading] = useState(true);
  const [showFreestyle, setShowFreestyle] = useState(false);

  // Auto-launch when coming from "Practice Again" with full context
  useEffect(() => {
    const autostart = searchParams.get("autostart");
    const company = searchParams.get("company");
    const reqId = searchParams.get("runRequestId");
    const type = searchParams.get("meetingType");

    if (autostart === "true" && company) {
      // Launch directly without showing the form
      launchDirect(company, type || "discovery", reqId || undefined);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoaded) {
      fetchHistory();
      fetchBlitzRuns();
    }
  }, [isLoaded]);

  async function fetchHistory() {
    try {
      const res = await fetch("/api/practice/history?limit=10");
      const data = await res.json();
      setSessions(data.sessions || []);
      setUsage(data.usage || { used: 0, tier: null });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function fetchBlitzRuns() {
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      const completed = (data.requests || []).filter(
        (r: BlitzRun) => r.status === "delivered" || r.status === "ready" || r.status === "completed"
      );
      setBlitzRuns(completed);
    } catch {
      // silent
    }
  }

  async function launchDirect(company: string, type: string, runRequestId?: string) {
    setStarting(true);
    setError(null);

    try {
      const res = await fetch("/api/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCompany: company,
          meetingType: type,
          ...(runRequestId ? { runRequestId } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start session");
        setStarting(false);
        return;
      }

      if (!data.sessionId) {
        setError("Session created but no ID returned. Please try again.");
        setStarting(false);
        return;
      }

      const queryParams = new URLSearchParams();
      if (data.persona?.gender) queryParams.set("gender", data.persona.gender);
      if (data.persona?.name) queryParams.set("persona", encodeURIComponent(data.persona.name));
      const qs = queryParams.toString();
      router.push(`/practice/${data.sessionId}${qs ? `?${qs}` : ""}`);
    } catch {
      setError("Failed to start session");
      setStarting(false);
    }
  }

  async function launchBlitz(run: BlitzRun) {
    const type = inferMeetingType(run.toolName);
    setLaunchingId(run.id);
    setError(null);
    await launchDirect(run.targetCompany, type, run.id);
    setLaunchingId(null);
  }

  async function handleFreestyleStart() {
    if (!targetCompany.trim()) {
      setError("Enter a company name.");
      return;
    }
    await launchDirect(targetCompany.trim(), meetingType);
  }

  const outcomeColor = (outcome: string | null) => {
    if (outcome === "strong") return "text-emerald-600 bg-emerald-50";
    if (outcome === "developing") return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const tierCap = usage.tier === "closer" ? 10 : usage.tier === "pro" ? 3 : 0;
  const atCap = usage.used >= tierCap;

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  // Auto-launching state (from Practice Again)
  if (starting && searchParams.get("autostart") === "true") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-700" />
        <p className="text-sm text-gray-500">Starting your next session...</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="/practice" />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-emerald-700" />
            <h1 className="text-2xl font-bold text-gray-900">Practice Mode</h1>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            {usage.used}/{tierCap} sessions this month
          </span>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {atCap && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You&apos;ve used all {tierCap} practice sessions for this month.{" "}
            {usage.tier !== "closer" && (
              <a href="/settings" className="font-semibold underline hover:text-amber-900">Upgrade your plan</a>
            )}{" "}
            to unlock more sessions.
          </div>
        )}

        {/* HERO: Practice Your Blitz Runs */}
        {blitzRuns.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900">Practice with Your Research</h2>
            <p className="mt-1 text-sm text-gray-500">
              Each persona is built from your blitz intel. They know the company, the role & what to push on. One click to start.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {blitzRuns.slice(0, 8).map((run) => {
                const scenario = SCENARIO_LABELS[run.toolName] || "Practice Call";
                const isLaunching = launchingId === run.id;
                return (
                  <button
                    key={run.id}
                    onClick={() => launchBlitz(run)}
                    disabled={starting || atCap}
                    className="group flex items-center gap-4 rounded-xl border-2 border-gray-100 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md disabled:opacity-50"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 transition group-hover:bg-emerald-100">
                      {isLaunching ? (
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                      ) : (
                        <Play className="h-5 w-5 text-emerald-700" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{run.targetCompany}</p>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {scenario}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500 truncate">
                        {run.targetName}{run.targetRole ? ` \u00b7 ${run.targetRole}` : ""}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600">Research-powered</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-emerald-500" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Sessions</h2>
              <a
                href="/practice/history"
                className="text-sm text-emerald-700 hover:text-emerald-900"
              >
                View All
              </a>
            </div>

            <div className="mt-4 space-y-3">
              {sessions.map((s) => (
                <a
                  key={s.id}
                  href={s.status === "completed" ? `/practice/${s.id}/review` : `/practice/${s.id}`}
                  className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                      <Target className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{s.targetCompany}</p>
                      <p className="text-sm text-gray-500">
                        {s.personaName} &middot; {s.targetRole}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {s.durationSeconds && (
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        {Math.round(s.durationSeconds / 60)}m
                      </div>
                    )}
                    {s.cotmScore && (
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {(s.cotmScore as { overall: number }).overall}/5
                      </div>
                    )}
                    {s.outcome && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeColor(s.outcome)}`}
                      >
                        {s.outcome}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Freestyle Practice (demoted, collapsible) */}
        <div className="mt-10">
          {!showFreestyle ? (
            <button
              onClick={() => setShowFreestyle(true)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              Freestyle practice (no blitz required)
            </button>
          ) : (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700">Freestyle Practice</h3>
              <p className="mt-1 text-xs text-gray-400">
                No research data. We&apos;ll generate a generic persona from the company name.
              </p>
              <div className="mt-4 flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500">Company</label>
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    placeholder="e.g. Acme Corp, Globex"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    onKeyDown={(e) => e.key === "Enter" && handleFreestyleStart()}
                  />
                </div>
                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500">Type</label>
                  <select
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="discovery">Discovery Call</option>
                    <option value="follow_up">Follow-Up</option>
                    <option value="pitch">Pitch / Demo</option>
                    <option value="closing">Closing</option>
                    <option value="interview">Interview</option>
                  </select>
                </div>
                <button
                  onClick={handleFreestyleStart}
                  disabled={starting || atCap}
                  className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900 disabled:opacity-50"
                >
                  {starting && !launchingId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Start
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Empty state when no blitz runs */}
        {blitzRuns.length === 0 && sessions.length === 0 && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <Video className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-4 text-sm font-semibold text-gray-700">No practice scenarios yet</h3>
            <p className="mt-1 text-sm text-gray-400">
              Run a blitz first. The research powers your persona, so every practice session gets smarter with more context.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
