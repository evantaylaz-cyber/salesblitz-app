"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Minus,
  ThumbsDown,
  Clock,
} from "lucide-react";
import VoiceTextarea from "@/components/VoiceTextarea";

interface Debrief {
  id: string;
  content: string;
  outcome: string | null;
  nextSteps: string | null;
  createdAt: string;
}

const OUTCOME_OPTIONS = [
  {
    value: "positive",
    label: "Went well",
    icon: ThumbsUp,
    color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
    activeColor: "bg-green-100 border-green-400 text-green-800 ring-2 ring-green-300",
  },
  {
    value: "neutral",
    label: "Mixed",
    icon: Minus,
    color: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
    activeColor: "bg-yellow-100 border-yellow-400 text-yellow-800 ring-2 ring-yellow-300",
  },
  {
    value: "negative",
    label: "Didn't land",
    icon: ThumbsDown,
    color: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    activeColor: "bg-red-100 border-red-400 text-red-800 ring-2 ring-red-300",
  },
];

export default function DebriefSection({ requestId }: { requestId: string }) {
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Form state
  const [content, setContent] = useState("");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [nextSteps, setNextSteps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchDebriefs = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}/debrief`);
      if (res.ok) {
        const data = await res.json();
        setDebriefs(data.debriefs || []);
      }
    } catch {
      // silent fail on fetch
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDebriefs();
  }, [fetchDebriefs]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Tell us how it went before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/requests/${requestId}/debrief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          outcome,
          nextSteps: nextSteps.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save debrief");
      }

      // Reset form, show success, refresh list
      setContent("");
      setOutcome(null);
      setNextSteps("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await fetchDebriefs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const outcomeLabel = (val: string | null) => {
    if (!val) return null;
    const opt = OUTCOME_OPTIONS.find((o) => o.value === val);
    return opt ? opt.label : val;
  };

  const outcomeColor = (val: string | null) => {
    switch (val) {
      case "positive":
        return "text-green-600";
      case "neutral":
        return "text-yellow-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  if (loading) return null; // Don't flash anything while loading

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold text-gray-900">Post-Run Debrief</h2>
          {debriefs.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {debriefs.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-6 py-5 space-y-6">
          {/* Existing debriefs */}
          {debriefs.length > 0 && (
            <div className="space-y-4">
              {debriefs.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {new Date(d.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {d.outcome && (
                      <span
                        className={`text-xs font-medium ${outcomeColor(
                          d.outcome
                        )}`}
                      >
                        {outcomeLabel(d.outcome)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {d.content}
                  </p>
                  {d.nextSteps && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Next Steps
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {d.nextSteps}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* New debrief form */}
          <div className="space-y-4">
            {debriefs.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700">
                  Add another debrief
                </p>
              </div>
            )}

            {debriefs.length === 0 && (
              <p className="text-sm text-gray-500">
                How did it go? Your notes here feed into future runs targeting
                this company, so the next prep package picks up where you left
                off.
              </p>
            )}

            {/* Outcome selector */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                How did it go?
              </label>
              <div className="flex gap-2">
                {OUTCOME_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = outcome === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setOutcome(isActive ? null : opt.value)
                      }
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        isActive ? opt.activeColor : opt.color
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                What happened? What landed, what didn&apos;t, key intel, objections?
              </label>
              <VoiceTextarea
                value={content}
                onChange={setContent}
                rows={4}
                placeholder="e.g. Discovery went well. They're evaluating 3 vendors, budget approved Q2. Champion is VP Ops (Sarah). Main objection: integration timeline..."
              />
            </div>

            {/* Next steps */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Next steps (optional)
              </label>
              <VoiceTextarea
                value={nextSteps}
                onChange={setNextSteps}
                rows={2}
                placeholder="e.g. Send ROI calculator by Friday, schedule technical deep dive with their IT lead..."
              />
            </div>

            {/* Error / Success */}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-600">
                Debrief saved. This context will feed into your next run.
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Save Debrief
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
