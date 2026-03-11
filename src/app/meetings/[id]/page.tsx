"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Attendee {
  name: string;
  title?: string;
  company?: string;
  role?: string;
}

interface KeyMoment {
  timestamp: string;
  what: string;
  why: string;
}

interface Objection {
  objection: string;
  response: string;
  effectiveness: string;
}

interface Commitment {
  who: string;
  what: string;
  deadline: string;
}

interface CoachingNote {
  dimension: string;
  observation: string;
  suggestion: string;
}

interface Analysis {
  summary: string;
  meetingType: string;
  attendees: Attendee[];
  keyMoments: KeyMoment[];
  objections: Objection[];
  commitments: Commitment[];
  dealQualification: {
    gaps: string[];
    strengths: string[];
    riskLevel: string;
  };
  coachingNotes: CoachingNote[];
  nextSteps: string[];
  outcome: string;
  overallScore: number;
}

interface TranscriptSegment {
  speaker?: string;
  text: string;
  startTime?: number;
  endTime?: number;
}

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
  analysis: Analysis | null;
  transcript: TranscriptSegment[] | null;
  rawTranscript: string | null;
  attendees: Attendee[] | null;
  targetId: string | null;
  runRequestId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const effectivenessColors: Record<string, string> = {
  strong: "text-emerald-400",
  adequate: "text-amber-400",
  weak: "text-red-400",
  unaddressed: "text-zinc-500",
};

const riskColors: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "transcript">(
    "analysis"
  );

  const fetchRecording = useCallback(async () => {
    try {
      const res = await fetch(`/api/meeting/${params.id}`);
      if (!res.ok) throw new Error("Recording not found");
      const data = await res.json();
      setRecording(data.recording);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchRecording();
  }, [fetchRecording]);

  // Poll if still processing
  useEffect(() => {
    if (
      !recording ||
      (recording.status !== "transcribing" && recording.status !== "analyzing")
    )
      return;

    const interval = setInterval(fetchRecording, 5000);
    return () => clearInterval(interval);
  }, [recording, fetchRecording]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-zinc-800" />
          <div className="h-4 w-96 rounded bg-zinc-800" />
          <div className="h-64 rounded-lg bg-zinc-800/50" />
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-red-400">{error || "Recording not found"}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-sm text-emerald-400 hover:underline"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const analysis = recording.analysis;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-2 inline-block text-xs text-zinc-500 hover:text-zinc-300"
        >
          &larr; Dashboard
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">
              {recording.meetingTitle || "Meeting Recording"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
              {recording.meetingDate && (
                <span>
                  {new Date(recording.meetingDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {recording.platform && (
                <span className="capitalize">{recording.platform.replace(/_/g, " ")}</span>
              )}
              {recording.audioDuration && (
                <span>
                  {Math.floor(recording.audioDuration / 60)}m{" "}
                  {recording.audioDuration % 60}s
                </span>
              )}
              {recording.meetingType && (
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs capitalize">
                  {recording.meetingType.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {recording.outcome && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  recording.outcome === "strong"
                    ? "bg-emerald-900/50 text-emerald-300"
                    : recording.outcome === "developing"
                      ? "bg-amber-900/50 text-amber-300"
                      : recording.outcome === "needs_work"
                        ? "bg-red-900/50 text-red-300"
                        : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {recording.outcome.replace(/_/g, " ")}
              </span>
            )}
            {recording.overallScore != null && (
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-100">
                  {recording.overallScore.toFixed(1)}
                </div>
                <div className="text-[10px] text-zinc-500">/ 5.0</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status banner for in-progress */}
      {recording.status !== "completed" && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            recording.status === "failed"
              ? "border-red-800 bg-red-950/30"
              : "border-blue-800 bg-blue-950/30"
          }`}
        >
          <p className="text-sm">
            {recording.status === "transcribing" &&
              "Transcribing audio... This may take a few minutes."}
            {recording.status === "analyzing" &&
              "Analyzing transcript for intelligence..."}
            {recording.status === "failed" &&
              `Analysis failed: ${recording.errorMessage || "Unknown error"}`}
            {recording.status === "processing" && "Processing..."}
          </p>
        </div>
      )}

      {/* Tabs */}
      {recording.status === "completed" && analysis && (
        <>
          <div className="mb-6 flex gap-1 rounded-lg bg-zinc-900 p-1">
            <button
              onClick={() => setActiveTab("analysis")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "analysis"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Analysis
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "transcript"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Transcript
            </button>
          </div>

          {activeTab === "analysis" && (
            <div className="space-y-6">
              {/* Summary */}
              <Section title="Summary">
                <p className="text-sm leading-relaxed text-zinc-300">
                  {analysis.summary}
                </p>
              </Section>

              {/* Attendees */}
              {analysis.attendees?.length > 0 && (
                <Section title="Attendees">
                  <div className="flex flex-wrap gap-2">
                    {analysis.attendees.map((a, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-zinc-800/50 px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-zinc-200">
                          {a.name}
                        </span>
                        {a.title && (
                          <span className="text-zinc-500"> - {a.title}</span>
                        )}
                        {a.company && (
                          <span className="text-zinc-500"> @ {a.company}</span>
                        )}
                        {a.role && (
                          <span className="ml-1 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] capitalize text-zinc-400">
                            {a.role}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Key Moments */}
              {analysis.keyMoments?.length > 0 && (
                <Section title="Key Moments">
                  <div className="space-y-3">
                    {analysis.keyMoments.map((m, i) => (
                      <div
                        key={i}
                        className="border-l-2 border-zinc-700 pl-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">
                            {m.timestamp}
                          </span>
                          <span className="text-sm text-zinc-200">
                            {m.what}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">{m.why}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Objections */}
              {analysis.objections?.length > 0 && (
                <Section title="Objections Handled">
                  <div className="space-y-3">
                    {analysis.objections.map((o, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-zinc-800/30 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-zinc-200">
                            &ldquo;{o.objection}&rdquo;
                          </p>
                          <span
                            className={`flex-shrink-0 text-xs font-medium ${
                              effectivenessColors[o.effectiveness] ||
                              "text-zinc-400"
                            }`}
                          >
                            {o.effectiveness}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          Response: {o.response}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Deal Qualification */}
              {analysis.dealQualification && (
                <Section title="Deal Qualification">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase text-zinc-500">
                        Risk Level
                      </div>
                      <span
                        className={`text-sm font-semibold capitalize ${
                          riskColors[analysis.dealQualification.riskLevel] ||
                          "text-zinc-300"
                        }`}
                      >
                        {analysis.dealQualification.riskLevel}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase text-zinc-500">
                        Strengths
                      </div>
                      <ul className="space-y-1">
                        {analysis.dealQualification.strengths?.map((s, i) => (
                          <li key={i} className="text-xs text-emerald-400">
                            + {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase text-zinc-500">
                        Gaps
                      </div>
                      <ul className="space-y-1">
                        {analysis.dealQualification.gaps?.map((g, i) => (
                          <li key={i} className="text-xs text-red-400">
                            - {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Section>
              )}

              {/* Commitments */}
              {analysis.commitments?.length > 0 && (
                <Section title="Commitments">
                  <div className="space-y-2">
                    {analysis.commitments.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="flex-shrink-0 font-medium text-zinc-300">
                          {c.who}:
                        </span>
                        <span className="text-zinc-400">{c.what}</span>
                        {c.deadline && (
                          <span className="flex-shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">
                            by {c.deadline}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Coaching Notes */}
              {analysis.coachingNotes?.length > 0 && (
                <Section title="Coaching Notes">
                  <div className="space-y-3">
                    {analysis.coachingNotes.map((n, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-zinc-800/30 p-3"
                      >
                        <div className="mb-1 text-[10px] font-semibold uppercase text-emerald-500">
                          {n.dimension.replace(/_/g, " ")}
                        </div>
                        <p className="text-sm text-zinc-300">
                          {n.observation}
                        </p>
                        <p className="mt-1 text-xs text-emerald-400/80">
                          Suggestion: {n.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Next Steps */}
              {analysis.nextSteps?.length > 0 && (
                <Section title="Next Steps">
                  <ul className="space-y-1">
                    {analysis.nextSteps.map((step, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-zinc-300"
                      >
                        <span className="mt-0.5 text-emerald-500">&#8226;</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}

          {activeTab === "transcript" && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              {recording.transcript && recording.transcript.length > 0 ? (
                <div className="space-y-3">
                  {recording.transcript.map(
                    (seg: TranscriptSegment, i: number) => (
                      <div key={i} className="flex gap-3">
                        {seg.speaker && (
                          <span className="flex-shrink-0 text-xs font-semibold text-emerald-400">
                            {seg.speaker}:
                          </span>
                        )}
                        <p className="text-sm leading-relaxed text-zinc-300">
                          {seg.text}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : recording.rawTranscript ? (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-400">
                  {recording.rawTranscript}
                </pre>
              ) : (
                <p className="text-sm text-zinc-500">
                  No transcript available.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      {children}
    </div>
  );
}
