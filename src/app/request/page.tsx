"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  FileText,
  User as UserIcon,
  Building2,
  Briefcase,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Calendar,
  Globe,
  Sparkles,
} from "lucide-react";

const TOOL_INFO: Record<string, { name: string; category: "interview" | "prospect" | "deal" }> = {
  interview_outreach: { name: "Interview Outreach", category: "interview" },
  interview_prep: { name: "Interview Prep", category: "interview" },
  prospect_outreach: { name: "Prospect Outreach", category: "prospect" },
  prospect_prep: { name: "Prospect Prep", category: "prospect" },
  deal_audit: { name: "Deal Audit", category: "deal" },
  champion_builder: { name: "Champion Builder", category: "deal" },
};

export default function RequestPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toolId = searchParams.get("tool") || "";
  const toolInfo = TOOL_INFO[toolId];

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [targetName, setTargetName] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetCompanyUrl, setTargetCompanyUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinText, setLinkedinText] = useState("");
  const [engagementType, setEngagementType] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [priorInteractions, setPriorInteractions] = useState("");
  const [jobPostingUrl, setJobPostingUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // UI state
  const [engagementExpanded, setEngagementExpanded] = useState(false);
  const [fetchingJd, setFetchingJd] = useState(false);
  const [fetchJdError, setFetchJdError] = useState<string | null>(null);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!toolInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-3 text-gray-600">Invalid tool selected.</p>
          <a href="/dashboard" className="mt-4 inline-block text-indigo-600 hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const isInterview = toolInfo.category === "interview";
  const isProspect = toolInfo.category === "prospect";
  const isDeal = toolInfo.category === "deal";

  async function fetchJobDescription() {
    if (!jobPostingUrl) return;
    setFetchingJd(true);
    setFetchJdError(null);
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobPostingUrl, type: "job_posting" }),
      });
      const data = await res.json();
      if (res.ok && data.extracted?.jobDescription) {
        setJobDescription(data.extracted.jobDescription);
      } else {
        setFetchJdError(data.error || "Failed to extract job description");
      }
    } catch {
      setFetchJdError("Network error — try pasting the JD manually");
    } finally {
      setFetchingJd(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: toolId,
          targetName,
          targetCompany,
          targetRole: targetRole || undefined,
          targetCompanyUrl: targetCompanyUrl || undefined,
          jobDescription: jobDescription || undefined,
          linkedinUrl: linkedinUrl || undefined,
          linkedinText: linkedinText || undefined,
          engagementType: engagementType || undefined,
          meetingDate: meetingDate || undefined,
          priorInteractions: priorInteractions || undefined,
          additionalNotes: additionalNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Failed to submit request");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Request Submitted</h1>
          <p className="mt-3 text-gray-600">
            Your <strong>{toolInfo.name}</strong> request for{" "}
            <strong>{targetName}</strong> at <strong>{targetCompany}</strong> has been submitted.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            You&apos;ll receive your deliverables within 24 hours. Priority processing requests are handled first.
          </p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{toolInfo.name}</h1>
            <p className="text-sm text-gray-500">Submit your request details below</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Target Info */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              {isInterview ? "Who are you targeting?" : isProspect ? "Who is the prospect?" : "Deal details"}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                  {isInterview ? "Interviewer / Contact Name" : "Prospect Name"} *
                </label>
                <input
                  type="text"
                  required
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder={isInterview ? "e.g., Sarah Chen" : "e.g., Mike Thompson"}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  Company *
                </label>
                <input
                  type="text"
                  required
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g., Stripe"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                  Role / Title
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g., VP of Engineering"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Globe className="h-3.5 w-3.5 text-gray-400" />
                  Company Website
                </label>
                <input
                  type="url"
                  value={targetCompanyUrl}
                  onChange={(e) => setTargetCompanyUrl(e.target.value)}
                  placeholder="https://stripe.com"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">Optional — we&apos;ll research them either way</p>
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Target&apos;s LinkedIn</h2>
            <p className="text-sm text-gray-500 mb-4">
              Copy their LinkedIn profile and paste it below. The more you include, the better your deliverables.
            </p>
            <div className="mb-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <LinkIcon className="h-3.5 w-3.5 text-gray-400" />
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                Paste LinkedIn Profile
              </label>
              <textarea
                value={linkedinText}
                onChange={(e) => setLinkedinText(e.target.value)}
                rows={6}
                placeholder="Go to their LinkedIn profile → select all (Ctrl+A / Cmd+A) → paste here. Include their About, Experience, Education — everything helps."
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
              />
            </div>
          </div>

          {/* Engagement Context (collapsible) */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setEngagementExpanded(!engagementExpanded)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-base font-semibold text-gray-900">Engagement Context</h2>
                <p className="text-sm text-gray-500">
                  Optional — helps us tailor the approach and urgency
                </p>
              </div>
              {engagementExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {engagementExpanded && (
              <div className="space-y-4 mt-4 pt-4 border-t">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                    Engagement Type
                  </label>
                  <select
                    value={engagementType}
                    onChange={(e) => setEngagementType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="Cold Outreach">Cold Outreach</option>
                    <option value="Warm Introduction">Warm Introduction</option>
                    <option value="Interview">Interview</option>
                    <option value="Follow-Up">Follow-Up</option>
                    <option value="Multi-Threading">Multi-Threading</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    Meeting / Interview Date
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    Prior Interactions
                  </label>
                  <textarea
                    value={priorInteractions}
                    onChange={(e) => setPriorInteractions(e.target.value)}
                    rows={3}
                    placeholder="Any previous emails, calls, or meetings with this person?"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Job Description (interview tools) */}
          {isInterview && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Job Description</h2>
              <p className="text-sm text-gray-500 mb-4">
                Paste the JD or drop a link — we&apos;ll extract it automatically.
              </p>

              {/* Job posting URL with fetch button */}
              <div className="mb-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <LinkIcon className="h-3.5 w-3.5 text-gray-400" />
                  Job Posting URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={jobPostingUrl}
                    onChange={(e) => setJobPostingUrl(e.target.value)}
                    placeholder="https://boards.greenhouse.io/stripe/jobs/..."
                    className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={fetchJobDescription}
                    disabled={!jobPostingUrl || fetchingJd}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                  >
                    {fetchingJd ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {fetchingJd ? "Fetching..." : "Fetch JD"}
                  </button>
                </div>
                {fetchJdError && (
                  <p className="mt-1.5 text-xs text-red-500">{fetchJdError}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  Full Job Description *
                </label>
                <textarea
                  required
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={10}
                  placeholder="Paste the complete job description here, or use the Fetch button above..."
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                />
              </div>
            </div>
          )}

          {/* Context for prospect/deal tools */}
          {(isProspect || isDeal) && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Account Context</h2>
              <p className="text-sm text-gray-500 mb-4">
                {isDeal
                  ? "Describe the deal situation — where it stands, what you're stuck on, what you need to close."
                  : "What are you selling? Any context about this account or prospect that would help?"}
              </p>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  {isDeal ? "Deal Context" : "Account / Product Context"}
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={6}
                  placeholder={
                    isDeal
                      ? "What stage is the deal? Who are the stakeholders? What's blocking progress?"
                      : "What product are you selling? What do you know about this account?"
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                />
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                Additional Notes (optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                placeholder="Anything else we should know? Specific areas to focus on, upcoming deadlines, etc."
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              This will use 1 run from your balance.
            </p>
            <button
              type="submit"
              disabled={submitting || !targetName || !targetCompany}
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
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
