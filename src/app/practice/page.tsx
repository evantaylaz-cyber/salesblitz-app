"use client";

import { useState, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Video,
  Loader2,
  Clock,
  Target,
  TrendingUp,
  Play,
  ChevronRight,
  Zap,
  FileText,
  CheckCircle2,
} from "lucide-react";

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
  const [runRequestId, setRunRequestId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [blitzRuns, setBlitzRuns] = useState<BlitzRun[]>([]);
  const [usage, setUsage] = useState<{ used: number; tier: string | null }>({ used: 0, tier: null });
  const [loading, setLoading] = useState(true);

  // Pre-populate from URL params (linked from blitz detail page)
  useEffect(() => {
    const company = searchParams.get("company");
    const reqId = searchParams.get("runRequestId");
    const type = searchParams.get("meetingType");
    if (company) setTargetCompany(company);
    if (reqId) setRunRequestId(reqId);
    if (type) setMeetingType(type);
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
      // Filter to completed/delivered/ready runs that have research data
      const completed = (data.requests || []).filter(
        (r: BlitzRun) => r.status === "delivered" || r.status === "ready" || r.status === "completed"
      );
      setBlitzRuns(completed);
    } catch {
      // silent
    }
  }

  function selectBlitz(run: BlitzRun) {
    setRunRequestId(run.id);
    setTargetCompany(run.targetCompany);
    // Infer meeting type from tool name
    if (run.toolName.startsWith("interview_")) {
      setMeetingType("interview");
    }
  }

  async function handleStart() {
    if (!targetCompany.trim()) {
      setError("Enter a company name.");
      return;
    }
    setStarting(true);
    setError(null);

    try {
      const res = await fetch("/api/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCompany: targetCompany.trim(),
          meetingType,
          ...(runRequestId ? { runRequestId } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start session");
        setStarting(false);
        return;
      }

      router.push(`/practice/${data.sessionId}`);
    } catch {
      setError("Failed to start session");
      setStarting(false);
    }
  }

  const outcomeColor = (outcome: string | null) => {
    if (outcome === "strong") return "text-emerald-600 bg-emerald-50";
    if (outcome === "developing") return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const tierCap = usage.tier === "closer" ? 10 : usage.tier === "pro" ? 3 : 0;

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-emerald-700" />
              <h1 className="text-xl font-bold text-gray-900">AI Practice Mode</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {usage.used}/{tierCap} sessions this month
            </span>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Research-powered banner (when linked from a blitz) */}
        {runRequestId && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <Zap className="h-5 w-5 text-emerald-600" />
            <p className="text-sm text-emerald-800">
              <span className="font-semibold">Research-powered session.</span>{" "}
              This practice call will use real research from your {targetCompany} blitz to generate a more accurate persona.
            </p>
            <button
              onClick={() => {
                setRunRequestId(null);
                router.replace("/practice", { scroll: false });
              }}
              className="ml-auto text-xs text-emerald-600 hover:text-emerald-800 whitespace-nowrap"
            >
              Start fresh instead
            </button>
          </div>
        )}

        {/* Start New Session */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Start a Practice Session</h2>
          <p className="mt-1 text-sm text-gray-500">
            Name a target company. We&apos;ll generate a persona from real research and you&apos;ll practice
            a live conversation against a video avatar. Works for prospect calls, interview panels, or any meeting.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Target Company</label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. CBRE, Salesforce, Home Depot"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Meeting Type</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="discovery">Discovery Call</option>
                <option value="follow_up">Follow-Up</option>
                <option value="pitch">Pitch / Demo</option>
                <option value="closing">Closing</option>
                <option value="interview">Interview (you're the candidate)</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleStart}
            disabled={starting || usage.used >= tierCap}
            className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Persona...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Practice
              </>
            )}
          </button>
        </div>

        {/* Use Research from a Blitz */}
        {blitzRuns.length > 0 && !runRequestId && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-900">Or Practice a Completed Blitz</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select a blitz run to practice with a persona built from real research.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {blitzRuns.slice(0, 6).map((run) => (
                <button
                  key={run.id}
                  onClick={() => selectBlitz(run)}
                  className="flex items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <FileText className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{run.targetCompany}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {run.targetName}{run.targetRole ? ` \u00b7 ${run.targetRole}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {TOOL_LABELS[run.toolName] || run.toolName}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Past Sessions */}
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
      </main>
    </div>
  );
}
