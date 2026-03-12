"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Mic, Clock, Search, AlertTriangle } from "lucide-react";

interface Recording {
  id: string;
  meetingType: string | null;
  meetingTitle: string | null;
  meetingDate: string | null;
  platform: string | null;
  audioDuration: number | null;
  outcome: string | null;
  overallScore: number | null;
  status: string;
  transcriptSource: string | null;
  createdAt: string;
  targetId: string | null;
}

interface MeetingRecordingsProps {
  targetId?: string;
  limit?: number;
  showTitle?: boolean;
}

const platformLabels: Record<string, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Teams",
  phone: "Phone",
  other: "Other",
};

const outcomeColors: Record<string, string> = {
  strong: "bg-emerald-900/50 text-emerald-300",
  developing: "bg-amber-900/50 text-amber-300",
  needs_work: "bg-red-900/50 text-red-300",
  unknown: "bg-zinc-800 text-zinc-400",
};

const statusColors: Record<string, string> = {
  processing: "bg-blue-900/50 text-blue-300",
  transcribing: "bg-blue-900/50 text-blue-300",
  analyzing: "bg-purple-900/50 text-purple-300",
  completed: "bg-emerald-900/50 text-emerald-300",
  failed: "bg-red-900/50 text-red-300",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  }
  return `${mins}m ${secs}s`;
}

export default function MeetingRecordings({
  targetId,
  limit = 10,
  showTitle = true,
}: MeetingRecordingsProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecordings() {
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (targetId) params.set("targetId", targetId);

        const res = await fetch(`/api/meeting/upload?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load recordings");

        const data = await res.json();
        setRecordings(data.recordings || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchRecordings();
  }, [targetId, limit]);

  // Poll for in-progress recordings (use ref to avoid circular dep)
  const recordingsRef = React.useRef(recordings);
  recordingsRef.current = recordings;

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;

    async function poll() {
      const hasInProgress = recordingsRef.current.some(
        (r) => r.status === "transcribing" || r.status === "analyzing"
      );
      if (!hasInProgress || !active) return;

      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (targetId) params.set("targetId", targetId);

        const res = await fetch(`/api/meeting/upload?${params.toString()}`);
        if (res.ok && active) {
          const data = await res.json();
          setRecordings(data.recordings || []);
        }
      } catch {
        // Silent fail on poll
      }

      if (active) {
        timeout = setTimeout(poll, 5000);
      }
    }

    // Start polling after initial load
    timeout = setTimeout(poll, 5000);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [targetId, limit]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-zinc-800/50" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">{error}</p>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 p-6 text-center">
        <Mic className="mx-auto mb-2 h-6 w-6 text-zinc-500" />
        <p className="text-sm text-zinc-400">
          No meeting recordings yet. Use the Sales Blitz Chrome extension to
          record meetings, or upload a transcript manually.
        </p>
      </div>
    );
  }

  return (
    <div>
      {showTitle && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Meeting Recordings
        </h3>
      )}
      <div className="space-y-2">
        {recordings.map((rec) => (
          <Link
            key={rec.id}
            href={`/meetings/${rec.id}`}
            className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-200">
                    {rec.meetingTitle || "Untitled meeting"}
                  </span>
                  {rec.status !== "completed" && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        statusColors[rec.status] || statusColors.processing
                      }`}
                    >
                      {rec.status === "transcribing" && <Clock className="mr-1 inline h-3 w-3" />}
                      {rec.status === "analyzing" && <Search className="mr-1 inline h-3 w-3" />}
                      {rec.status === "failed" && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                      {rec.status}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                  {rec.meetingDate && (
                    <span>
                      {new Date(rec.meetingDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {!rec.meetingDate && (
                    <span>
                      {new Date(rec.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {rec.platform && (
                    <span>{platformLabels[rec.platform] || rec.platform}</span>
                  )}
                  {rec.audioDuration && (
                    <span>{formatDuration(rec.audioDuration)}</span>
                  )}
                  {rec.meetingType && (
                    <span className="capitalize">
                      {rec.meetingType.replace(/_/g, " ")}
                    </span>
                  )}
                  {rec.transcriptSource && (
                    <span className="text-zinc-600">
                      {rec.transcriptSource === "extension_tab_capture"
                        ? "Extension"
                        : rec.transcriptSource === "manual_upload"
                          ? "Manual"
                          : rec.transcriptSource}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {rec.status === "completed" && rec.outcome && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      outcomeColors[rec.outcome] || outcomeColors.unknown
                    }`}
                  >
                    {rec.outcome.replace(/_/g, " ")}
                  </span>
                )}
                {rec.status === "completed" &&
                  rec.overallScore != null && (
                    <span className="text-sm font-semibold text-zinc-300">
                      {rec.overallScore.toFixed(1)}
                      <span className="text-xs text-zinc-500">/5</span>
                    </span>
                  )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
