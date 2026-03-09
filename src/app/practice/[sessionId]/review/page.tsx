"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  Target,
  TrendingUp,
  Star,
  AlertTriangle,
  ChevronRight,
  Loader2,
  MessageSquare,
  BarChart3,
  RotateCcw,
  Save,
  CheckCircle2,
  PenLine,
} from "lucide-react";
import AppNav from "@/components/AppNav";

// Score keys differ between sales and interview rubrics
type SalesScoreBreakdown = {
  before_state: number;
  negative_consequences: number;
  required_capabilities: number;
  positive_business_outcomes: number;
  how_we_do_it: number;
  discovery_quality: number;
  objection_handling: number;
  conversation_flow: number;
};

type InterviewScoreBreakdown = {
  storytelling: number;
  company_knowledge: number;
  role_fit: number;
  question_quality: number;
  objection_handling: number;
  executive_presence: number;
  discovery_listening: number;
  closing_strength: number;
};

type ScoreBreakdown = SalesScoreBreakdown | InterviewScoreBreakdown;

interface SessionData {
  id: string;
  targetCompany: string;
  targetRole: string;
  personaName: string;
  personaConfig: {
    name: string;
    title: string;
    company: string;
    personality: string;
    _meetingType?: string;
    _isPanelMode?: boolean;
    _panelMembers?: Array<{ name: string; title: string | null; roleInMeeting: string }>;
  };
  transcript: Array<{ role: string; text: string; timestamp: string; speaker?: string; speakerTitle?: string }>;
  durationSeconds: number | null;
  cotmScore: {
    overall: number;
    scores: ScoreBreakdown;
    top_moment: string;
    biggest_miss: string;
  } | null;
  feedback: string | null;
  outcome: string | null;
  isPanelMode: boolean;
  sessionSequence: number;
  targetId: string | null;
  runRequestId: string | null;
  userNotes: string | null;
  createdAt: string;
}

const SALES_SCORE_LABELS: Record<string, string> = {
  before_state: "Current Challenges",
  negative_consequences: "Cost of Inaction",
  required_capabilities: "Required Capabilities",
  positive_business_outcomes: "Business Outcomes",
  how_we_do_it: "Solution Approach",
  discovery_quality: "Discovery Quality",
  objection_handling: "Objection Handling",
  conversation_flow: "Conversation Flow",
};

const INTERVIEW_SCORE_LABELS: Record<string, string> = {
  storytelling: "Storytelling & Examples",
  company_knowledge: "Company Knowledge",
  role_fit: "Role Fit",
  question_quality: "Question Quality",
  objection_handling: "Objection Handling",
  executive_presence: "Executive Presence",
  discovery_listening: "Discovery & Listening",
  closing_strength: "Closing Strength",
};

export default function PracticeReviewPage() {
  const { isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (isLoaded && sessionId) fetchSession();
  }, [isLoaded, sessionId]);

  async function fetchSession() {
    try {
      const res = await fetch(`/api/practice/session?id=${sessionId}`);
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        setUserNotes(data.session.userNotes || "");
        if (data.session.userNotes) setNotesSaved(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function saveNotes() {
    if (!sessionId || notesSaving) return;
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      const res = await fetch(`/api/practice/session?id=${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNotes }),
      });
      if (res.ok) setNotesSaved(true);
    } catch {
      // silent
    } finally {
      setNotesSaving(false);
    }
  }

  const outcomeColor = (outcome: string | null) => {
    if (outcome === "strong") return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (outcome === "developing") return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const scoreColor = (score: number) => {
    if (score >= 4) return "bg-emerald-500";
    if (score >= 3) return "bg-amber-500";
    return "bg-red-500";
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Session not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="/practice" />

      {/* Practice Again action bar */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <h1 className="text-lg font-bold text-gray-900">Session Review</h1>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set("autostart", "true");
              if (session?.targetCompany) params.set("company", session.targetCompany);
              if (session?.personaConfig?._meetingType) params.set("meetingType", session.personaConfig._meetingType);
              if (session?.runRequestId) params.set("runRequestId", session.runRequestId);
              router.push(`/practice?${params.toString()}`);
            }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <RotateCcw className="h-4 w-4" />
            Practice Again
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Session Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{session.targetCompany}</h2>
            <p className="mt-1 text-gray-500">
              {session.personaName} &middot; {session.targetRole}
            </p>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
              {session.durationSeconds && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {Math.round(session.durationSeconds / 60)} minutes
                </span>
              )}
              <span>{new Date(session.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {session.outcome && (
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${outcomeColor(session.outcome)}`}>
              {session.outcome === "strong" ? "Strong" : session.outcome === "developing" ? "Developing" : "Needs Work"}
            </span>
          )}
        </div>

        {/* Overall Score */}
        {session.cotmScore && (() => {
          const meetingType = session.personaConfig?._meetingType || "discovery";
          const isInterview = meetingType === "interview" || ["phone_screen", "hiring_manager", "mock_pitch", "panel", "final", "executive"].includes(meetingType);
          const scoreLabels = isInterview ? INTERVIEW_SCORE_LABELS : SALES_SCORE_LABELS;
          const scorecardTitle = isInterview ? "Interview Scorecard" : "Sales Scorecard";

          return (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="h-5 w-5 text-emerald-700" />
                <h3 className="text-lg font-bold text-gray-900">{scorecardTitle}</h3>
                {session.sessionSequence > 1 && (
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    Session #{session.sessionSequence}
                  </span>
                )}
                <span className="ml-auto text-3xl font-bold text-gray-900">
                  {session.cotmScore.overall}/5
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(session.cotmScore.scores || {}).map(([key, score]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-48 text-sm text-gray-600">
                      {scoreLabels[key] || key}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${scoreColor(score as number)} transition-all`}
                        style={{ width: `${((score as number) / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium text-gray-700">
                      {score as number}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Highlights */}
        {session.cotmScore && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {session.cotmScore.top_moment && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Top Moment</span>
                </div>
                <p className="text-sm text-emerald-800">{session.cotmScore.top_moment}</p>
              </div>
            )}
            {session.cotmScore.biggest_miss && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Biggest Miss</span>
                </div>
                <p className="text-sm text-amber-800">{session.cotmScore.biggest_miss}</p>
              </div>
            )}
          </div>
        )}

        {/* Coaching Feedback */}
        {session.feedback && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Coaching Feedback</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {session.feedback}
            </div>
          </div>
        )}

        {/* Self-Debrief Notes */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900">Your Debrief</h3>
            </div>
            <div className="flex items-center gap-2">
              {notesSaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved
                </span>
              )}
              <button
                onClick={saveNotes}
                disabled={notesSaving}
                className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition"
              >
                <Save className="h-3.5 w-3.5" />
                {notesSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            What landed? What felt shaky? What do you want to nail next time?
          </p>
          <textarea
            value={userNotes}
            onChange={(e) => {
              setUserNotes(e.target.value);
              setNotesSaved(false);
            }}
            placeholder="Write your reflections here. These carry forward to your next practice session for this target."
            rows={4}
            maxLength={5000}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{userNotes.length}/5000</p>
        </div>

        {/* Transcript Toggle */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex w-full items-center justify-between p-6 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900">Full Transcript</h3>
              <span className="text-sm text-gray-400">
                ({(session.transcript || []).length} messages)
              </span>
            </div>
            <ChevronRight
              className={`h-5 w-5 text-gray-400 transition ${showTranscript ? "rotate-90" : ""}`}
            />
          </button>
          {showTranscript && (
            <div className="border-t px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
              {(session.transcript || []).map((entry, i) => (
                <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      entry.role === "user"
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="mb-1 text-xs font-medium text-gray-500">
                      {entry.role === "user" ? "You" : (
                        <>
                          {entry.speaker || session.personaName}
                          {entry.speakerTitle && session.isPanelMode && (
                            <span className="ml-1 text-gray-400">&middot; {entry.speakerTitle}</span>
                          )}
                        </>
                      )}
                    </p>
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
