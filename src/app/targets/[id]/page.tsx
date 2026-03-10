"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Target,
  Building2,
  User,
  Brain,
  Zap,
  Clock,
  ChevronLeft,
  Loader2,
  Briefcase,
  GraduationCap,
  MessageSquare,
  BarChart3,
  ArrowUpRight,
  FileText,
  Video,
  PenLine,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Pause,
  Trophy,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import Link from "next/link";

interface TargetDetail {
  id: string;
  companyName: string;
  contactName: string | null;
  contactTitle: string | null;
  type: "prospect" | "interview";
  status: string;
  roundCount: number;
  accumulatedIntel: string | null;
  intelDepth: "none" | "light" | "moderate" | "deep";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    blitzes: number;
    practices: number;
    debriefs: number;
  };
  runRequests: {
    id: string;
    toolName: string;
    status: string;
    targetCompany: string;
    targetContact: string | null;
    meetingType: string | null;
    createdAt: string;
    completedAt: string | null;
    hasResearch: boolean;
    debriefs: {
      id: string;
      content: string;
      outcome: string | null;
      nextSteps: string | null;
      createdAt: string;
    }[];
  }[];
  practiceSessions: {
    id: string;
    targetRole: string | null;
    outcome: string | null;
    cotmScore: any;
    overallFeedback: string | null;
    completedAt: string | null;
    createdAt: string;
  }[];
}

const INTEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  none: { bg: "bg-zinc-800", text: "text-zinc-500", label: "No Intel" },
  light: { bg: "bg-amber-900/30", text: "text-amber-400", label: "Light" },
  moderate: { bg: "bg-blue-900/30", text: "text-blue-400", label: "Growing" },
  deep: { bg: "bg-emerald-900/30", text: "text-emerald-400", label: "Deep" },
};

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  active: { color: "text-emerald-400", icon: CheckCircle2, label: "Active" },
  paused: { color: "text-amber-400", icon: Pause, label: "Paused" },
  closed: { color: "text-zinc-500", icon: XCircle, label: "Closed" },
  won: { color: "text-emerald-400", icon: Trophy, label: "Won" },
  lost: { color: "text-red-400", icon: XCircle, label: "Lost" },
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TargetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [target, setTarget] = useState<TargetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user || !params.id) return;
    fetch(`/api/targets/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.target) {
          setTarget(data.target);
          setNotesValue(data.target.notes || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoaded, user, params.id]);

  const updateStatus = async (newStatus: string) => {
    if (!target || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/targets/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTarget((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (e) {
      // silent
    }
    setStatusUpdating(false);
  };

  const saveNotes = async () => {
    if (!target) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/targets/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue }),
      });
      if (res.ok) {
        setTarget((prev) => (prev ? { ...prev, notes: notesValue } : null));
        setEditingNotes(false);
      }
    } catch (e) {
      // silent
    }
    setSavingNotes(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <AppNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <AppNav />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <p className="text-zinc-400">Target not found.</p>
          <Link href="/targets" className="text-orange-400 hover:underline mt-2 inline-block">
            Back to Targets
          </Link>
        </div>
      </div>
    );
  }

  const intel = INTEL_COLORS[target.intelDepth];
  const statusCfg = STATUS_CONFIG[target.status] || STATUS_CONFIG.active;
  const TypeIcon = target.type === "interview" ? GraduationCap : Briefcase;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AppNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          href="/targets"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          All Targets
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-800 rounded-xl">
              <Building2 className="h-7 w-7 text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{target.companyName}</h1>
                <TypeIcon className="h-5 w-5 text-zinc-500" />
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${intel.bg} ${intel.text}`}>
                  <Brain className="h-3.5 w-3.5" />
                  {intel.label} — R{target.roundCount}
                </div>
              </div>
              {target.contactName && (
                <div className="flex items-center gap-1.5 text-sm text-zinc-400 mt-1">
                  <User className="h-3.5 w-3.5" />
                  {target.contactName}
                  {target.contactTitle && (
                    <span className="text-zinc-600"> — {target.contactTitle}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 mt-1">
                <Clock className="h-3 w-3" />
                Created {formatDate(target.createdAt)} — Updated {timeAgo(target.updatedAt)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href={`/request?target=${target.id}&company=${encodeURIComponent(target.companyName)}${target.contactName ? `&contact=${encodeURIComponent(target.contactName)}` : ""}${target.type === "interview" ? "&tool=interview_prep" : "&tool=prospect_prep"}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Re-Blitz
            </Link>
          </div>
        </div>

        {/* Status + Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {/* Status selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-500 mb-2">Status</div>
            <select
              value={target.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={statusUpdating}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-orange-500"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-500">Blitzes</div>
            <div className="text-xl font-bold mt-1 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-orange-400" />
              {target.counts.blitzes}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-500">Debriefs</div>
            <div className="text-xl font-bold mt-1 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              {target.counts.debriefs}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-500">Practice</div>
            <div className="text-xl font-bold mt-1 flex items-center gap-1.5">
              <Video className="h-4 w-4 text-purple-400" />
              {target.counts.practices}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-500">Rounds</div>
            <div className="text-xl font-bold mt-1 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              {target.roundCount}
            </div>
          </div>
        </div>

        {/* Accumulated Intel */}
        {target.accumulatedIntel && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-orange-400" />
              Accumulated Intelligence
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <pre className="text-sm text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
                {target.accumulatedIntel}
              </pre>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <PenLine className="h-4 w-4 text-orange-400" />
            Notes
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            {editingNotes ? (
              <div>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-orange-500 resize-none"
                  rows={4}
                  placeholder="Add notes about this target..."
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {savingNotes ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setNotesValue(target.notes || "");
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingNotes(true)}
                className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-300 transition-colors min-h-[40px]"
              >
                {target.notes || (
                  <span className="text-zinc-600 italic">Click to add notes...</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Blitz History */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-400" />
            Blitz History ({target.runRequests.length})
          </h2>
          {target.runRequests.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-600">
              No blitzes yet. Hit Re-Blitz above to start.
            </div>
          ) : (
            <div className="space-y-3">
              {target.runRequests.map((rr) => (
                <div
                  key={rr.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-400" />
                      <span className="text-sm font-medium">
                        {TOOL_LABELS[rr.toolName] || rr.toolName}
                      </span>
                      {rr.meetingType && (
                        <span className="text-xs text-zinc-600">({rr.meetingType})</span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          rr.status === "completed"
                            ? "bg-emerald-900/30 text-emerald-400"
                            : rr.status === "failed"
                            ? "bg-red-900/30 text-red-400"
                            : "bg-amber-900/30 text-amber-400"
                        }`}
                      >
                        {rr.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-600">{formatDate(rr.createdAt)}</span>
                      <Link
                        href={`/requests/${rr.id}`}
                        className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                      >
                        View <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Debriefs for this blitz */}
                  {rr.debriefs.length > 0 && (
                    <div className="ml-6 mt-2 space-y-2">
                      {rr.debriefs.map((d) => (
                        <div
                          key={d.id}
                          className="bg-zinc-800/50 rounded-lg p-3 text-xs"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-3 w-3 text-blue-400" />
                            <span className="text-zinc-400 font-medium">Debrief</span>
                            {d.outcome && (
                              <span className="text-zinc-500">— {d.outcome}</span>
                            )}
                            <span className="text-zinc-600 ml-auto">
                              {formatDate(d.createdAt)}
                            </span>
                          </div>
                          <p className="text-zinc-500 line-clamp-2">{d.content}</p>
                          {d.nextSteps && (
                            <p className="text-zinc-600 mt-1 italic">
                              Next: {d.nextSteps}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Practice History */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-400" />
            Practice Sessions ({target.practiceSessions.length})
          </h2>
          {target.practiceSessions.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-600">
              No practice sessions yet. Complete a blitz, then practice from it.
            </div>
          ) : (
            <div className="space-y-3">
              {target.practiceSessions.map((ps) => (
                <div
                  key={ps.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium">
                        {ps.targetRole || "Practice"}
                      </span>
                      {ps.outcome && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            ps.outcome === "passed"
                              ? "bg-emerald-900/30 text-emerald-400"
                              : ps.outcome === "failed"
                              ? "bg-red-900/30 text-red-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {ps.outcome}
                        </span>
                      )}
                      {ps.cotmScore && (
                        <span className="text-xs text-zinc-500">
                          Score: {typeof ps.cotmScore === "object" ? JSON.stringify(ps.cotmScore).slice(0, 40) : ps.cotmScore}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-600">
                        {formatDate(ps.completedAt || ps.createdAt)}
                      </span>
                      <Link
                        href={`/practice/${ps.id}/review`}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                      >
                        Review <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                  {ps.overallFeedback && (
                    <p className="text-xs text-zinc-500 mt-2 line-clamp-2 ml-6">
                      {ps.overallFeedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
