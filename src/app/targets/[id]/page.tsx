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
  Video,
  PenLine,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Pause,
  Trophy,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import MeetingRecordings from "@/components/MeetingRecordings";
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
  none: { bg: "bg-gray-100", text: "text-gray-400", label: "No Intel" },
  light: { bg: "bg-amber-50", text: "text-amber-600", label: "Light" },
  moderate: { bg: "bg-blue-50", text: "text-blue-600", label: "Growing" },
  deep: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Deep" },
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
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-gray-500">Target not found.</p>
          <Link href="/targets" className="text-emerald-600 hover:underline mt-2 inline-block">
            Back to Targets
          </Link>
        </div>
      </div>
    );
  }

  const intel = INTEL_COLORS[target.intelDepth];
  const TypeIcon = target.type === "interview" ? GraduationCap : Briefcase;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Back link */}
        <Link
          href="/targets"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          All Targets
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-xl">
              <Building2 className="h-7 w-7 text-gray-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{target.companyName}</h1>
                <TypeIcon className="h-5 w-5 text-gray-400" />
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${intel.bg} ${intel.text}`}>
                  <Brain className="h-3.5 w-3.5" />
                  {intel.label} R{target.roundCount}
                </div>
              </div>
              {target.contactName && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                  <User className="h-3.5 w-3.5" />
                  {target.contactName}
                  {target.contactTitle && (
                    <span className="text-gray-400">, {target.contactTitle}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                <Clock className="h-3 w-3" />
                Created {formatDate(target.createdAt)} &middot; Updated {timeAgo(target.updatedAt)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <Link
            href={`/request?target=${target.id}&company=${encodeURIComponent(target.companyName)}${target.contactName ? `&contact=${encodeURIComponent(target.contactName)}` : ""}${target.type === "interview" ? "&tool=interview_prep" : "&tool=prospect_prep"}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Re-Blitz
          </Link>
        </div>

        {/* Status + Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-gray-500 mb-2">Status</div>
            <select
              value={target.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={statusUpdating}
              className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-emerald-500 text-gray-700"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-gray-500">Blitzes</div>
            <div className="text-xl font-bold mt-1 flex items-center gap-1.5 text-gray-900">
              <Zap className="h-4 w-4 text-emerald-500" />
              {target.counts.blitzes}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-gray-500">Debriefs</div>
            <div className="text-xl font-bold mt-1 flex items-center gap-1.5 text-gray-900">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              {target.counts.debriefs}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-gray-500">Practice</div>
            <div className="text-xl font-bold mt-1 flex items-center gap-1.5 text-gray-900">
              <Video className="h-4 w-4 text-purple-500" />
              {target.counts.practices}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-gray-500">Rounds</div>
            <div className="text-xl font-bold mt-1 flex items-center gap-1.5 text-gray-900">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              {target.roundCount}
            </div>
          </div>
        </div>

        {/* Accumulated Intel */}
        {target.accumulatedIntel && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-500" />
              Accumulated Intelligence
            </h2>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <pre className="text-sm text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
                {target.accumulatedIntel}
              </pre>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <PenLine className="h-4 w-4 text-emerald-500" />
            Notes
          </h2>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            {editingNotes ? (
              <div>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:border-emerald-500 resize-none"
                  rows={4}
                  placeholder="Add notes about this target..."
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {savingNotes ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setNotesValue(target.notes || "");
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingNotes(true)}
                className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 transition-colors min-h-[40px]"
              >
                {target.notes || (
                  <span className="text-gray-300 italic">Click to add notes...</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Blitz History */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            Blitz History ({target.runRequests.length})
          </h2>
          {target.runRequests.length === 0 ? (
            <div className="rounded-xl border bg-white p-5 shadow-sm text-sm text-gray-400">
              No blitzes yet. Hit Re-Blitz above to start.
            </div>
          ) : (
            <div className="space-y-3">
              {target.runRequests.map((rr) => (
                <div
                  key={rr.id}
                  className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {TOOL_LABELS[rr.toolName] || rr.toolName}
                      </span>
                      {rr.meetingType && (
                        <span className="text-xs text-gray-400">({rr.meetingType})</span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          rr.status === "completed" || rr.status === "delivered"
                            ? "bg-emerald-50 text-emerald-600"
                            : rr.status === "failed"
                            ? "bg-red-50 text-red-500"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {rr.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{formatDate(rr.createdAt)}</span>
                      <Link
                        href={`/requests/${rr.id}`}
                        className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
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
                          className="bg-gray-50 rounded-lg p-3 text-xs border border-gray-100"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-3 w-3 text-blue-500" />
                            <span className="text-gray-600 font-medium">Debrief</span>
                            {d.outcome && (
                              <span className="text-gray-400">{d.outcome}</span>
                            )}
                            <span className="text-gray-300 ml-auto">
                              {formatDate(d.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-500 line-clamp-2">{d.content}</p>
                          {d.nextSteps && (
                            <p className="text-gray-400 mt-1 italic">
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
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-500" />
            Practice Sessions ({target.practiceSessions.length})
          </h2>
          {target.practiceSessions.length === 0 ? (
            <div className="rounded-xl border bg-white p-5 shadow-sm text-sm text-gray-400">
              No practice sessions yet. Complete a blitz, then practice from it.
            </div>
          ) : (
            <div className="space-y-3">
              {target.practiceSessions.map((ps) => (
                <div
                  key={ps.id}
                  className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {ps.targetRole || "Practice"}
                      </span>
                      {ps.outcome && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            ps.outcome === "passed"
                              ? "bg-emerald-50 text-emerald-600"
                              : ps.outcome === "failed"
                              ? "bg-red-50 text-red-500"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {ps.outcome}
                        </span>
                      )}
                      {ps.cotmScore && (
                        <span className="text-xs text-gray-400">
                          Score: {typeof ps.cotmScore === "object" ? JSON.stringify(ps.cotmScore).slice(0, 40) : ps.cotmScore}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {formatDate(ps.completedAt || ps.createdAt)}
                      </span>
                      <Link
                        href={`/practice/${ps.id}/review`}
                        className="text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1 transition-colors"
                      >
                        Review <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                  {ps.overallFeedback && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 ml-6">
                      {ps.overallFeedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meeting Recordings */}
        <div className="mt-6">
          <MeetingRecordings targetId={target.id} limit={10} />
        </div>
      </div>
    </div>
  );
}
