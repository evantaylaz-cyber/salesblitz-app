"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Clock,
  Target,
  TrendingUp,
  ChevronRight,
  Loader2,
  BarChart3,
  Video,
} from "lucide-react";
import AppNav from "@/components/AppNav";

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

export default function PracticeHistoryPage() {
  const { isLoaded } = useUser();
  const router = useRouter();
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<{ used: number; tier: string | null }>({ used: 0, tier: null });

  useEffect(() => {
    if (isLoaded) fetchHistory();
  }, [isLoaded]);

  async function fetchHistory() {
    try {
      const res = await fetch("/api/practice/history?limit=50");
      const data = await res.json();
      setSessions(data.sessions || []);
      setUsage(data.usage || { used: 0, tier: null });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const outcomeColor = (outcome: string | null) => {
    if (outcome === "strong") return "text-emerald-600 bg-emerald-50";
    if (outcome === "developing") return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const completedSessions = sessions.filter((s) => s.status === "completed" && s.cotmScore);
  const avgScore =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + ((s.cotmScore as { overall: number })?.overall || 0), 0) /
        completedSessions.length
      : 0;

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="/practice" />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Practice History</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track your sessions, scores & improvement over time.
            </p>
          </div>
          <button
            onClick={() => router.push("/practice")}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
          >
            <Video className="h-4 w-4" />
            New Session
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-10">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Sessions</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{sessions.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Average Score</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {avgScore > 0 ? avgScore.toFixed(1) : "--"}/5
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">This Month</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {usage.used}/{usage.tier === "closer" ? 10 : usage.tier === "pro" ? 3 : 0}
            </p>
          </div>
        </div>

        {/* Session List */}
        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-500">No practice sessions yet.</p>
            <button
              onClick={() => router.push("/practice")}
              className="mt-4 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Start Your First Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
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
                    <p className="text-xs text-gray-400">
                      {new Date(s.createdAt).toLocaleDateString()} at{" "}
                      {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeColor(s.outcome)}`}>
                      {s.outcome}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
