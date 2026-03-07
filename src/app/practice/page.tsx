"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Video,
  Loader2,
  Clock,
  Target,
  TrendingUp,
  Play,
  ChevronRight,
} from "lucide-react";

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

export default function PracticeLanding() {
  const { isLoaded } = useUser();
  const router = useRouter();
  const [targetCompany, setTargetCompany] = useState("");
  const [meetingType, setMeetingType] = useState("discovery");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [usage, setUsage] = useState<{ used: number; tier: string | null }>({ used: 0, tier: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) fetchHistory();
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
        body: JSON.stringify({ targetCompany: targetCompany.trim(), meetingType }),
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
        {/* Start New Session */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Start a Practice Session</h2>
          <p className="mt-1 text-sm text-gray-500">
            Name a target company. We'll generate a persona from real research and you'll practice
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
