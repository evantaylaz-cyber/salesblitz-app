"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Building2,
  User as UserIcon,
  Clock,
} from "lucide-react";

interface ClarificationQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "open_ended";
  options?: string[];
  why?: string;
}

interface ClarificationData {
  requestId: string;
  toolName: string;
  targetCompany: string;
  targetName: string;
  status: string;
  clarificationQuestions: {
    questions: ClarificationQuestion[];
    confidence_without_answers: number;
    reasoning: string;
  };
  clarificationAnswers: Record<string, string> | null;
}

const TOOL_DISPLAY: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  interview_prep: "Interview Prep",
  prospect_outreach: "Prospect Outreach",
  prospect_prep: "Prospect Prep",
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
  competitor_research: "Competitive Research",
};

export default function ClarifyPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClarificationData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;

    async function fetchQuestions() {
      try {
        const res = await fetch(`/api/requests/${requestId}/clarify`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Failed to load questions");
          return;
        }
        const result = await res.json();
        setData(result);

        // If already answered, show that state
        if (result.clarificationAnswers) {
          setAnswers(result.clarificationAnswers);
          setSubmitted(true);
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, [isLoaded, clerkUser, requestId]);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleMultipleChoice(questionId: string, option: string) {
    setAnswers((prev) => {
      const current = prev[questionId] || "";
      // For multiple choice, we store the selected option directly
      // If clicking the same option, deselect it
      if (current === option) {
        const next = { ...prev };
        delete next[questionId];
        return next;
      }
      return { ...prev, [questionId]: option };
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/requests/${requestId}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const result = await res.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || "Failed to submit answers");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm text-gray-500">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-3 text-gray-600">{error}</p>
          <a
            href="/dashboard"
            className="mt-4 inline-block text-indigo-600 hover:underline"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Already submitted / not awaiting clarification
  if (submitted || (data && data.status !== "awaiting_clarification")) {
    const isRunning = data?.status === "submitted" || data?.status === "processing";
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {submitted ? "Answers Submitted" : "Request In Progress"}
          </h1>
          <p className="mt-3 text-gray-600">
            {submitted
              ? `Your answers have been received. Your ${
                  TOOL_DISPLAY[data?.toolName || ""] || "research"
                } for ${data?.targetCompany} is now running with improved context.`
              : `This request is already ${data?.status}. No clarification needed.`}
          </p>
          {isRunning && (
            <p className="mt-2 text-sm text-gray-500">
              You&apos;ll receive an email when your deliverables are ready.
            </p>
          )}
          <div className="mt-6 flex gap-3 justify-center">
            <a
              href="/dashboard"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Back to Dashboard
            </a>
            <a
              href="/requests"
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View My Requests
            </a>
          </div>
        </div>
      </div>
    );
  }

  const questions = data?.clarificationQuestions?.questions || [];
  const confidence = Math.round(
    (data?.clarificationQuestions?.confidence_without_answers || 0.5) * 100
  );
  const toolDisplay = TOOL_DISPLAY[data?.toolName || ""] || "Research";
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">
              Quick Questions
            </h1>
            <p className="text-sm text-gray-500">
              {toolDisplay} for {data?.targetName} @ {data?.targetCompany}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>~2 min</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Context banner */}
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-indigo-900">
                A few quick questions to significantly improve your deliverables.
                Current confidence without your input:{" "}
                <strong>{confidence}%</strong>
              </p>
              {data?.clarificationQuestions?.reasoning && (
                <p className="mt-1 text-xs text-indigo-700">
                  {data.clarificationQuestions.reasoning}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-5">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{q.question}</p>
                  {q.why && (
                    <p className="mt-1 text-xs text-gray-500 italic">
                      Why: {q.why}
                    </p>
                  )}
                </div>
              </div>

              {q.type === "multiple_choice" && q.options ? (
                <div className="ml-10 flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleMultipleChoice(q.id, opt)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        answers[q.id] === opt
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  {/* Allow custom answer */}
                  <input
                    type="text"
                    placeholder="Or type your own..."
                    value={
                      answers[q.id] &&
                      !q.options.includes(answers[q.id])
                        ? answers[q.id]
                        : ""
                    }
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              ) : (
                <div className="ml-10">
                  <textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    rows={3}
                    placeholder="Type your answer..."
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit bar */}
        <div className="mt-8 flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">
            {answeredCount} of {questions.length} answered
            {!allAnswered && (
              <span className="ml-2 text-xs text-gray-400">
                (you can skip some — we&apos;ll do our best)
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit &amp; Run
                </>
              )}
            </button>
          </div>
        </div>

        {/* Skip option */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Don&apos;t have time? No worries — if you don&apos;t respond within
            24 hours, we&apos;ll proceed with our best analysis.
          </p>
        </div>
      </main>
    </div>
  );
}
