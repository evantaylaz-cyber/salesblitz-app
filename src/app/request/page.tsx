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
  Users,
  Plus,
  Trash2,
} from "lucide-react";
import VoiceTextarea from "@/components/VoiceTextarea";

const TOOL_INFO: Record<string, { name: string; category: "interview" | "prospect" | "deal" | "practice" }> = {
  interview_outreach: { name: "Interview Outreach", category: "interview" },
  interview_prep: { name: "Interview Prep", category: "interview" },
  prospect_outreach: { name: "Prospect Outreach", category: "prospect" },
  prospect_prep: { name: "Prospect Prep", category: "prospect" },
  deal_audit: { name: "Deal Audit", category: "deal" },
  champion_builder: { name: "Champion Builder", category: "deal" },
  practice_mode: { name: "AI Practice Mode", category: "practice" },
};

export default function RequestPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toolId = searchParams.get("tool") || "";
  const toolInfo = TOOL_INFO[toolId];

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [targetName, setTargetName] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetCompanyUrl, setTargetCompanyUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinText, setLinkedinText] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [engagementType, setEngagementType] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [priorInteractions, setPriorInteractions] = useState("");
  const [jobPostingUrl, setJobPostingUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [caseStudies, setCaseStudies] = useState("");
  const [interviewInstructions, setInterviewInstructions] = useState("");

  // Panel composition (interview_prep only)
  const [panelRoundType, setPanelRoundType] = useState("");
  const [panelRoundNumber, setPanelRoundNumber] = useState(1);
  const [panelMembers, setPanelMembers] = useState<Array<{
    name: string;
    title: string;
    roleInMeeting: string;
    personalityVibe: string;
    evaluationFocus: string;
    linkedinUrl: string;
  }>>([]);

  // UI state
  const [engagementExpanded, setEngagementExpanded] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [fetchingJd, setFetchingJd] = useState(false);
  const [fetchJdError, setFetchJdError] = useState<string | null>(null);

  function addPanelMember() {
    setPanelMembers([...panelMembers, {
      name: "",
      title: "",
      roleInMeeting: "hiring_manager",
      personalityVibe: "",
      evaluationFocus: "",
      linkedinUrl: "",
    }]);
  }

  function updatePanelMember(idx: number, field: string, value: string) {
    const updated = [...panelMembers];
    updated[idx] = { ...updated[idx], [field]: value };
    setPanelMembers(updated);
  }

  function removePanelMember(idx: number) {
    setPanelMembers(panelMembers.filter((_, i) => i !== idx));
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!toolInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-3 text-gray-600">Invalid tool selected.</p>
          <a href="/dashboard" className="mt-4 inline-block text-emerald-700 hover:underline">
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
          meetingType: meetingType || undefined,
          engagementType: engagementType || undefined,
          meetingDate: meetingDate || undefined,
          priorInteractions: priorInteractions || undefined,
          additionalNotes: additionalNotes || undefined,
          caseStudies: caseStudies || undefined,
          interviewInstructions: interviewInstructions || undefined,
          // Panel composition (interview_prep only)
          ...(toolId === "interview_prep" && panelMembers.length > 0 ? {
            panel: {
              roundType: panelRoundType || meetingType || "panel",
              roundNumber: panelRoundNumber,
              members: panelMembers.filter(m => m.name.trim()),
            },
          } : {}),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setSubmittedRequestId(data.requestId);
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
            Your deliverables are being generated now. Track progress in real-time below.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            {submittedRequestId && (
              <a
                href={`/requests/${submittedRequestId}`}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Track Progress
              </a>
            )}
            <a
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Dashboard
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
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">Optional — we&apos;ll research them either way</p>
              </div>
            </div>
          </div>

          {/* Meeting Type Selector — interview_prep & prospect_prep only */}
          {(toolId === "interview_prep" || toolId === "prospect_prep") && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                {toolId === "interview_prep" ? "Interview Type" : "Meeting Type"}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {toolId === "interview_prep"
                  ? "What kind of interview are you prepping for? This determines which call prep docs we generate."
                  : "What stage is this meeting? We tailor your speaker notes, arsenal, and call flow to match."}
              </p>
              <div className={`grid gap-3 ${toolId === "interview_prep" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                {toolId === "interview_prep" ? (
                  <>
                    {[
                      { id: "phone_screen", label: "Phone Screen", desc: "Recruiter or initial screen. Story bank, salary framing, role-fit talking points." },
                      { id: "hiring_manager", label: "Hiring Manager", desc: "1:1 with the HM. Speaker notes, arsenal, call flow tailored to their priorities." },
                      { id: "mock_pitch", label: "Mock Pitch", desc: "Live selling exercise. Speaker notes, arsenal, call flow, live scenario, Q&A doc." },
                      { id: "panel", label: "Panel Interview", desc: "Multiple interviewers. Prep for each panelist's focus area and switching dynamics." },
                      { id: "final", label: "Final Round", desc: "Executive or cross-functional final. High-stakes prep with objection handling." },
                      { id: "executive", label: "Executive / VP+", desc: "C-suite or VP conversation. Strategic narrative, business acumen, leadership framing." },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setMeetingType(type.id)}
                        className={`rounded-lg border p-4 text-left transition ${
                          meetingType === type.id
                            ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900">{type.label}</div>
                        <div className="mt-1 text-xs text-gray-500">{type.desc}</div>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setMeetingType("discovery")}
                      className={`rounded-lg border p-4 text-left transition ${
                        meetingType === "discovery"
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">Discovery</div>
                      <div className="mt-1 text-xs text-gray-500">
                        First call. 80% listening, qualify the deal, map pain.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType("follow_up")}
                      className={`rounded-lg border p-4 text-left transition ${
                        meetingType === "follow_up"
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">Follow-Up</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Go deeper on pain, map stakeholders, develop champion.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType("pitch")}
                      className={`rounded-lg border p-4 text-left transition ${
                        meetingType === "pitch"
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">Pitch / Demo</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Present your solution. Value narrative, handle objections.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType("closing")}
                      className={`rounded-lg border p-4 text-left transition ${
                        meetingType === "closing"
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">Closing</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Recap value, negotiate, build mutual action plan, get commitment.
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

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
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                Paste LinkedIn Profile
              </label>
              <VoiceTextarea
                value={linkedinText}
                onChange={setLinkedinText}
                rows={6}
                placeholder="Go to their LinkedIn profile → select all (Ctrl+A / Cmd+A) → paste here. Include their About, Experience, Education — everything helps."
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
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="cold_outreach">Cold Outreach</option>
                    <option value="warm_intro">Warm Introduction</option>
                    <option value="discovery_call">Discovery Call</option>
                    <option value="closing_call">Closing Call</option>
                    <option value="interview">Interview</option>
                    <option value="follow_up">Follow-Up</option>
                    <option value="multi_threading">Multi-Threading</option>
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
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    Prior Interactions
                  </label>
                  <VoiceTextarea
                    value={priorInteractions}
                    onChange={setPriorInteractions}
                    rows={3}
                    placeholder="Any previous emails, calls, or meetings with this person?"
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
                    className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={fetchJobDescription}
                    disabled={!jobPostingUrl || fetchingJd}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
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
                <VoiceTextarea
                  required
                  value={jobDescription}
                  onChange={setJobDescription}
                  rows={10}
                  placeholder="Paste the complete job description here, or use the Fetch button above..."
                />
              </div>
            </div>
          )}

          {/* Interview Instructions — interview tools only */}
          {isInterview && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Interview Instructions</h2>
              <p className="text-sm text-gray-500 mb-4">
                Were you given specific instructions to prepare? Paste the assignment, prompt, or prep details here. This gets injected directly into your deliverables.
              </p>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  Prep Instructions / Assignment
                </label>
                <VoiceTextarea
                  value={interviewInstructions}
                  onChange={setInterviewInstructions}
                  rows={6}
                  placeholder={"Example:\n\n\"Prepare a 10-minute mock first call as if you're selling to a mid-market prospect. You'll present to the hiring manager and AVP. Be ready for Q&A on how you handle objections and multi-thread.\""}
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  The more detail you give, the more tailored your speaker notes, arsenal, and call flow will be.
                </p>
              </div>
            </div>
          )}

          {/* Panel Composition (interview_prep only) */}
          {toolId === "interview_prep" && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setPanelExpanded(!panelExpanded);
                  if (!panelExpanded && panelMembers.length === 0) {
                    addPanelMember();
                  }
                }}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    Interview Panel
                  </h2>
                  <p className="text-sm text-gray-500">
                    Who will you be talking to? Adding panelists makes your practice sessions and prep docs way sharper.
                  </p>
                </div>
                {panelExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                )}
              </button>

              {panelExpanded && (
                <div className="space-y-4 mt-4 pt-4 border-t">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 text-sm font-medium text-gray-700">Round Number</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={panelRoundNumber}
                        onChange={(e) => setPanelRoundNumber(parseInt(e.target.value) || 1)}
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <p className="mt-1 text-xs text-gray-400">Which round is this? (1st, 2nd, 3rd...)</p>
                    </div>
                  </div>

                  {/* Panel Members */}
                  <div className="space-y-3">
                    {panelMembers.map((member, idx) => (
                      <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Panelist {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removePanelMember(idx)}
                            className="text-gray-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => updatePanelMember(idx, "name", e.target.value)}
                            placeholder="Name (e.g., Sarah Chen)"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                          <input
                            type="text"
                            value={member.title}
                            onChange={(e) => updatePanelMember(idx, "title", e.target.value)}
                            placeholder="Title (e.g., VP Sales)"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                          <select
                            value={member.roleInMeeting}
                            onChange={(e) => updatePanelMember(idx, "roleInMeeting", e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          >
                            <option value="hiring_manager">Hiring Manager</option>
                            <option value="peer">Peer Interviewer</option>
                            <option value="executive_sponsor">Executive / VP+</option>
                            <option value="technical_evaluator">Technical Evaluator</option>
                            <option value="cross_functional">Cross-Functional</option>
                          </select>
                          <select
                            value={member.personalityVibe}
                            onChange={(e) => updatePanelMember(idx, "personalityVibe", e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          >
                            <option value="">Personality (optional)</option>
                            <option value="analytical_skeptical">Analytical / Skeptical</option>
                            <option value="relationship_first">Relationship-First</option>
                            <option value="high_energy_challenger">High-Energy Challenger</option>
                            <option value="warm_collaborative">Warm / Collaborative</option>
                          </select>
                        </div>
                        <div className="mt-3">
                          <input
                            type="text"
                            value={member.evaluationFocus}
                            onChange={(e) => updatePanelMember(idx, "evaluationFocus", e.target.value)}
                            placeholder="What do they evaluate? (e.g., discovery depth, business acumen, cultural fit)"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPanelMember}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-500 hover:border-emerald-500 hover:text-emerald-700 transition w-full justify-center"
                    >
                      <Plus className="h-4 w-4" />
                      Add Panelist
                    </button>
                  </div>
                </div>
              )}
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
                <VoiceTextarea
                  value={jobDescription}
                  onChange={setJobDescription}
                  rows={6}
                  placeholder={
                    isDeal
                      ? "What stage is the deal? Who are the stakeholders? What's blocking progress?"
                      : "What product are you selling? What do you know about this account?"
                  }
                />
              </div>
            </div>
          )}

          {/* Case Studies — prospect tools only */}
          {isProspect && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Customer Stories &amp; Case Studies</h2>
              <p className="text-sm text-gray-500 mb-4">
                Paste any case studies, customer wins, or proof points you want referenced in your outreach and materials. The more specific the better: include metrics, customer names, and outcomes.
              </p>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  Case Studies (optional)
                </label>
                <VoiceTextarea
                  value={caseStudies}
                  onChange={setCaseStudies}
                  rows={6}
                  placeholder={"Example:\n\nAccenture - Reduced procurement cycle time by 40% in 6 months. $2.3M annual savings. VP of Procurement quoted: \"This transformed how we buy.\"\n\nDeloitte - 3x pipeline coverage in Q1 after deploying our platform across 12 practice areas. Expanded from pilot to enterprise in 90 days."}
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  These will be woven into your outreach sequence, POV deck, and research brief as social proof.
                </p>
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
              <VoiceTextarea
                value={additionalNotes}
                onChange={setAdditionalNotes}
                rows={3}
                placeholder="Anything else we should know? Specific areas to focus on, upcoming deadlines, etc."
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
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
