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
import { Upload } from "lucide-react";

// File upload helper: sends to upload-resume endpoint, returns extracted text
async function extractFileText(file: File): Promise<{ text: string; fileName: string } | { error: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/profile/upload-resume", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) return { error: data.error || "Upload failed" };
  return { text: data.text, fileName: data.fileName };
}

const TOOL_INFO: Record<string, { name: string; category: "interview" | "prospect" | "deal" | "practice"; subtitle: string }> = {
  interview_outreach: { name: "Interview Outreach", category: "interview", subtitle: "Name the role & the person you want to reach. We build the outreach package; you send it." },
  interview_prep: { name: "Interview Prep", category: "interview", subtitle: "Give us the details. We build your playbook, competitive intel & talk tracks for every interviewer." },
  prospect_outreach: { name: "Prospect Outreach", category: "prospect", subtitle: "Drop the account & contact. We research them and build multi-channel sequences that earn replies." },
  prospect_prep: { name: "Prospect Prep", category: "prospect", subtitle: "Tell us who you're meeting. We deliver research, talk tracks & a methodology-structured game plan." },
  deal_playbook: { name: "Deal Playbook", category: "deal", subtitle: "Walk us through the deal. We diagnose it, build your champion strategy, and tell you your next 3 moves." },
  proposal_blitz: { name: "Proposal Blitz", category: "deal", subtitle: "Tell us what you're proposing and who approves the budget. We build the business case with real ROI math." },
  // Backward compat — old links with ?tool=deal_audit or ?tool=champion_builder still work
  deal_audit: { name: "Deal Audit", category: "deal", subtitle: "Walk us through the deal. We qualify it and surface the gaps you're not seeing." },
  champion_builder: { name: "Champion Builder", category: "deal", subtitle: "Tell us about your champion. We equip them to sell internally when you're not in the room." },
  // practice_mode is NOT a blitz tool — it routes directly to /practice
};

// Mode-based tool routing: resolves user intent to the right backend tool
const MODE_QUESTIONS: Record<string, { label: string; subtitle: string; options: Array<{ label: string; description: string; toolName: string }> }> = {
  meeting: {
    label: "Prep for a meeting",
    subtitle: "What's the situation?",
    options: [
      { label: "I have a meeting scheduled", description: "Research, talk tracks & a game plan for your call", toolName: "prospect_prep" },
      { label: "I need to get the meeting first", description: "Cold outreach sequences that earn the first reply", toolName: "prospect_outreach" },
      { label: "I need to move a deal forward", description: "Qualification audit, champion strategy & your next 3 moves", toolName: "deal_playbook" },
      { label: "I need to build a proposal", description: "CFO-ready proposal with ROI math and pricing rationale", toolName: "proposal_blitz" },
    ],
  },
  interview: {
    label: "Prep for an interview",
    subtitle: "What's the situation?",
    options: [
      { label: "I have an interview scheduled", description: "Deep intel, POV deck & speaker notes per interviewer", toolName: "interview_prep" },
      { label: "I need to land the interview first", description: "Outreach to get the referral or the meeting", toolName: "interview_outreach" },
    ],
  },
};

export default function RequestPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Support both ?tool=xxx (direct) and ?mode=meeting/interview (simplified)
  const mode = searchParams.get("mode") || "";
  const [resolvedToolId, setResolvedToolId] = useState(searchParams.get("tool") || "");
  const toolId = resolvedToolId;
  const toolInfo = TOOL_INFO[toolId];
  const modeConfig = MODE_QUESTIONS[mode];

  const prefillTargetId = searchParams.get("target") || "";
  const prefillCompany = searchParams.get("company") || "";
  const prefillContact = searchParams.get("contact") || "";

  // Practice mode doesn't use the blitz pipeline — redirect to /practice
  useEffect(() => {
    if (toolId === "practice_mode") {
      router.replace("/practice");
    }
  }, [toolId, router]);

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

  // Prior run pre-fill
  interface PriorRun {
    id: string;
    toolName: string;
    targetName: string;
    targetCompany: string;
    targetRole: string | null;
    targetCompanyUrl: string | null;
    linkedinUrl: string | null;
    linkedinText: string | null;
    meetingType: string | null;
    jobDescription: string | null;
    additionalNotes: string | null;
    interviewInstructions: string | null;
    createdAt: string;
  }
  const [priorRuns, setPriorRuns] = useState<PriorRun[]>([]);
  const [matchingRun, setMatchingRun] = useState<PriorRun | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Fetch prior runs on load
  useEffect(() => {
    if (isLoaded) {
      fetch("/api/requests")
        .then(res => res.json())
        .then(data => setPriorRuns(data.requests || []))
        .catch(() => {});

      // Pre-fill from most recent target if no query params provided
      if (!prefillCompany) {
        fetch("/api/targets")
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            const targets = data?.targets;
            if (targets && targets.length > 0) {
              const latest = targets[0]; // most recent
              if (latest.companyName && !targetCompany) {
                setTargetCompany(latest.companyName);
                if (latest.contactName && !targetName) setTargetName(latest.contactName);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isLoaded]);

  // Pre-fill from target query params (Re-Blitz from target detail page)
  useEffect(() => {
    if (prefillCompany) setTargetCompany(prefillCompany);
    if (prefillContact) setTargetName(prefillContact);
  }, [prefillCompany, prefillContact]);

  // Check for matching prior run when company name changes
  useEffect(() => {
    if (!targetCompany.trim() || prefillApplied) {
      setMatchingRun(null);
      return;
    }
    const companyLower = targetCompany.trim().toLowerCase();
    const match = priorRuns.find(
      r => r.targetCompany?.toLowerCase() === companyLower && r.id !== undefined
    );
    setMatchingRun(match || null);
  }, [targetCompany, priorRuns, prefillApplied]);

  function applyPrefill(run: PriorRun) {
    if (run.targetName) setTargetName(run.targetName);
    if (run.targetRole) setTargetRole(run.targetRole);
    if (run.targetCompanyUrl) setTargetCompanyUrl(run.targetCompanyUrl);
    if (run.linkedinUrl) setLinkedinUrl(run.linkedinUrl);
    if (run.linkedinText) setLinkedinText(run.linkedinText);
    if (run.meetingType) setMeetingType(run.meetingType);
    if (run.jobDescription) setJobDescription(run.jobDescription);
    if (run.interviewInstructions) setInterviewInstructions(run.interviewInstructions);
    setPrefillApplied(true);
    setMatchingRun(null);
  }

  // Document upload state
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ fileName: string; text: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE) {
          setUploadError(`${file.name} is too large. Max 5MB per file.`);
          continue;
        }
        const result = await extractFileText(file);
        if ("error" in result) {
          setUploadError(result.error);
        } else {
          setUploadedDocs(prev => [...prev, { fileName: result.fileName, text: result.text }]);
        }
      }
    } catch {
      setUploadError("Failed to process file. Try pasting the content instead.");
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  }

  function removeUploadedDoc(idx: number) {
    setUploadedDocs(prev => prev.filter((_, i) => i !== idx));
  }

  // UI state
  const [engagementExpanded, setEngagementExpanded] = useState(true);
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // Mode selection screen: user picks intent, we resolve to the right tool
  if (!toolInfo && modeConfig) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="mx-auto max-w-xl px-6 py-16">
          <a href="/dashboard" className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition">
            <ArrowLeft className="h-4 w-4" /> Back
          </a>
          <h1 className="text-2xl font-bold text-white mb-2">{modeConfig.label}</h1>
          <p className="text-gray-400 mb-8">{modeConfig.subtitle}</p>
          <div className="space-y-3">
            {modeConfig.options.map((opt) => (
              <button
                key={opt.toolName}
                onClick={() => setResolvedToolId(opt.toolName)}
                className="w-full flex flex-col items-start rounded-xl border border-[#262626] bg-[#141414] p-5 text-left transition hover:border-emerald-500/30 hover:bg-[#1a1a1a] group"
              >
                <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition">{opt.label}</span>
                <span className="mt-1 text-xs text-gray-500">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!toolInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-3 text-neutral-300">Invalid tool selected.</p>
          <a href="/dashboard" className="mt-4 inline-block text-emerald-400 hover:underline">
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
      setFetchJdError("Network error. Try pasting the JD manually.");
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
          targetId: prefillTargetId || undefined,
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
          additionalNotes: [
            additionalNotes,
            ...uploadedDocs.map(d => `\n--- Uploaded: ${d.fileName} ---\n${d.text}`)
          ].filter(Boolean).join("\n") || undefined,
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Blitz Started</h1>
          <p className="mt-3 text-neutral-300">
            Your <strong>{toolInfo.name}</strong> blitz{" "}
            {targetName && targetCompany ? (
              <>for <strong>{targetName}</strong> at <strong>{targetCompany}</strong></>
            ) : targetName ? (
              <>for <strong>{targetName}</strong></>
            ) : targetCompany ? (
              <>for <strong>{targetCompany}</strong></>
            ) : null}{" "}is running.
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            We&apos;re researching and building your deliverables now. Track progress in real-time.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            {submittedRequestId && (
              <a
                href={`/requests/${submittedRequestId}`}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
              >
                Track Progress
              </a>
            )}
            <a
              href="/dashboard"
              className="rounded-lg border border-[#333333] bg-[#141414] px-5 py-2.5 text-sm font-medium text-neutral-200 hover:bg-[#0a0a0a]"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b bg-[#141414]">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-[#1a1a1a] hover:text-neutral-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">{toolInfo.name}</h1>
            <p className="text-sm text-neutral-400">{toolInfo.subtitle}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Target Info */}
          <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <h2 className="text-base font-semibold text-white mb-4">
              {isInterview ? "Who are you targeting?" : isProspect ? "Who is the prospect?" : "Deal details"}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                  <UserIcon className="h-3.5 w-3.5 text-neutral-500" />
                  {isInterview ? "Interviewer / Contact Name" : "Prospect Name"} <span className="text-neutral-500 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder={isInterview ? "e.g., Jamie Torres (or leave blank)" : "e.g., Alex Rivera (or leave blank)"}
                  className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                  <Building2 className="h-3.5 w-3.5 text-neutral-500" />
                  Company *
                </label>
                <input
                  type="text"
                  required
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g., Stripe"
                  className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                  <Briefcase className="h-3.5 w-3.5 text-neutral-500" />
                  Role / Title
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g., VP of Engineering"
                  className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                  <Globe className="h-3.5 w-3.5 text-neutral-500" />
                  Company Website
                </label>
                <input
                  type="url"
                  value={targetCompanyUrl}
                  onChange={(e) => setTargetCompanyUrl(e.target.value)}
                  placeholder="https://stripe.com"
                  className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <p className="mt-1 text-xs text-neutral-500">Optional. We&apos;ll research them either way.</p>
              </div>
            </div>

            {/* Pre-fill from prior run banner */}
            {matchingRun && !prefillApplied && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    You ran <strong>{TOOL_INFO[matchingRun.toolName]?.name || matchingRun.toolName}</strong> for {matchingRun.targetCompany}
                    {matchingRun.targetName ? ` (${matchingRun.targetName})` : ""} on{" "}
                    {new Date(matchingRun.createdAt).toLocaleDateString()}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => applyPrefill(matchingRun)}
                  className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition"
                >
                  Pre-fill
                </button>
              </div>
            )}

            {prefillApplied && (
              <p className="mt-3 text-xs text-emerald-400">
                <CheckCircle2 className="inline h-3 w-3 mr-1" />
                Pre-filled from prior run. Update any fields as needed.
              </p>
            )}
          </div>

          {/* Meeting Type Selector — interview_prep & prospect_prep only */}
          {(toolId === "interview_prep" || toolId === "prospect_prep") && (
            <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
              <h2 className="text-base font-semibold text-white mb-1">
                {toolId === "interview_prep" ? "Interview Type" : "Meeting Type"}
              </h2>
              <p className="text-sm text-neutral-400 mb-4">
                {toolId === "interview_prep"
                  ? "What kind of interview are you prepping for? This determines which call prep docs we generate."
                  : "What stage is this meeting? We tailor your speaker notes, prep package, and call flow to match."}
              </p>
              <div className={`grid gap-3 ${toolId === "interview_prep" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                {toolId === "interview_prep" ? (
                  <>
                    {[
                      { id: "phone_screen", label: "Phone Screen", desc: "Recruiter or initial screen. Story bank, salary framing, role-fit talking points." },
                      { id: "hiring_manager", label: "Hiring Manager", desc: "1:1 with the HM. Speaker notes, prep package, call flow tailored to their priorities." },
                      { id: "mock_pitch", label: "Mock Pitch", desc: "Live selling exercise. Speaker notes, prep package, call flow, live scenario, Q&A doc." },
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
                            ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                            : "border-[#262626] hover:border-[#333333] hover:bg-[#0a0a0a]"
                        }`}
                      >
                        <div className="font-medium text-sm text-white">{type.label}</div>
                        <div className="mt-1 text-xs text-neutral-400">{type.desc}</div>
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
                          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                          : "border-[#262626] hover:border-[#333333] hover:bg-[#0a0a0a]"
                      }`}
                    >
                      <div className="font-medium text-sm text-white">Discovery</div>
                      <div className="mt-1 text-xs text-neutral-400">
                        First call. 80% listening, qualify the deal, map pain.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType("follow_up")}
                      className={`rounded-lg border p-4 text-left transition ${
                        meetingType === "follow_up"
                          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                          : "border-[#262626] hover:border-[#333333] hover:bg-[#0a0a0a]"
                      }`}
                    >
                      <div className="font-medium text-sm text-white">Follow-Up</div>
                      <div className="mt-1 text-xs text-neutral-400">
                        Go deeper on pain, map stakeholders, develop champion.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType("pitch")}
                      className={`rounded-lg border p-4 text-left transition ${
                        meetingType === "pitch"
                          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                          : "border-[#262626] hover:border-[#333333] hover:bg-[#0a0a0a]"
                      }`}
                    >
                      <div className="font-medium text-sm text-white">Pitch / Demo</div>
                      <div className="mt-1 text-xs text-neutral-400">
                        Present your solution. Value narrative, handle objections.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType("closing")}
                      className={`rounded-lg border p-4 text-left transition ${
                        meetingType === "closing"
                          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                          : "border-[#262626] hover:border-[#333333] hover:bg-[#0a0a0a]"
                      }`}
                    >
                      <div className="font-medium text-sm text-white">Closing</div>
                      <div className="mt-1 text-xs text-neutral-400">
                        Recap value, negotiate, build mutual action plan, get commitment.
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* LinkedIn */}
          <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <h2 className="text-base font-semibold text-white mb-1">Target&apos;s LinkedIn</h2>
            <p className="text-sm text-neutral-400 mb-4">
              Copy their LinkedIn profile and paste it below. The more you include, the better your deliverables.
            </p>
            <div className="mb-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                <LinkIcon className="h-3.5 w-3.5 text-neutral-500" />
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                <UserIcon className="h-3.5 w-3.5 text-neutral-500" />
                Paste LinkedIn Profile
              </label>
              <VoiceTextarea
                value={linkedinText}
                onChange={setLinkedinText}
                rows={6}
                placeholder={"Go to their LinkedIn profile, select all (Ctrl+A / Cmd+A), paste here.\n\nInclude their About, Experience, Education. We'll extract their career trajectory, key accomplishments, and shared connections to personalize your materials."}
              />
            </div>
          </div>

          {/* Engagement Context (collapsible) */}
          <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <button
              type="button"
              onClick={() => setEngagementExpanded(!engagementExpanded)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-base font-semibold text-white">Engagement Context</h2>
                <p className="text-sm text-neutral-400">
                  Optional. Helps us tailor the approach and urgency.
                </p>
              </div>
              {engagementExpanded ? (
                <ChevronDown className="h-5 w-5 text-neutral-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-neutral-500" />
              )}
            </button>

            {engagementExpanded && (
              <div className="space-y-4 mt-4 pt-4 border-t">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                    <MessageSquare className="h-3.5 w-3.5 text-neutral-500" />
                    Engagement Type
                  </label>
                  <select
                    value={engagementType}
                    onChange={(e) => setEngagementType(e.target.value)}
                    className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    Meeting / Interview Date
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                    <FileText className="h-3.5 w-3.5 text-neutral-500" />
                    Prior Interactions
                  </label>
                  <VoiceTextarea
                    value={priorInteractions}
                    onChange={setPriorInteractions}
                    rows={3}
                    placeholder={"e.g., 'Had a 15-min intro call last Tuesday. She mentioned their current vendor's contract is up in Q3 and they're frustrated with reporting gaps. I sent a follow-up email with our ROI calculator.'"}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Job Description (interview tools) */}
          {isInterview && (
            <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
              <h2 className="text-base font-semibold text-white mb-1">Job Description</h2>
              <p className="text-sm text-neutral-400 mb-4">
                Paste the JD or drop a link. We&apos;ll extract it automatically.
              </p>

              {/* Job posting URL with fetch button */}
              <div className="mb-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                  <LinkIcon className="h-3.5 w-3.5 text-neutral-500" />
                  Job Posting URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={jobPostingUrl}
                    onChange={(e) => setJobPostingUrl(e.target.value)}
                    placeholder="https://boards.greenhouse.io/stripe/jobs/..."
                    className="flex-1 rounded-lg border border-[#333333] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={fetchJobDescription}
                    disabled={!jobPostingUrl || fetchingJd}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/100/15 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
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
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                  <FileText className="h-3.5 w-3.5 text-neutral-500" />
                  Full Job Description *
                </label>
                <VoiceTextarea
                  required
                  value={jobDescription}
                  onChange={setJobDescription}
                  rows={10}
                  placeholder={"Paste the complete job description here, or drop a link above and hit Fetch.\n\nInclude everything: title, responsibilities, requirements, qualifications, compensation if listed. The more detail, the sharper your prep materials."}
                />
              </div>
            </div>
          )}

          {/* Interview Instructions — interview tools only */}
          {isInterview && (
            <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
              <h2 className="text-base font-semibold text-white mb-1">Interview Instructions</h2>
              <p className="text-sm text-neutral-400 mb-4">
                Were you given specific instructions to prepare? Paste the assignment, prompt, or prep details here. This gets injected directly into your deliverables.
              </p>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                  <FileText className="h-3.5 w-3.5 text-neutral-500" />
                  Prep Instructions / Assignment
                </label>
                <VoiceTextarea
                  value={interviewInstructions}
                  onChange={setInterviewInstructions}
                  rows={6}
                  placeholder={"Example:\n\n\"Prepare a 10-minute mock first call as if you're selling to a mid-market prospect. You'll present to the hiring manager and AVP. Be ready for Q&A on how you handle objections and multi-thread.\""}
                />
                <p className="mt-1.5 text-xs text-neutral-500">
                  The more detail you give, the more tailored your speaker notes, prep package, and call flow will be.
                </p>
              </div>
            </div>
          )}

          {/* Panel Composition (interview_prep only) */}
          {toolId === "interview_prep" && (
            <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
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
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-neutral-500" />
                    Interview Panel
                  </h2>
                  <p className="text-sm text-neutral-400">
                    Who will you be talking to? Adding panelists makes your practice sessions and prep docs way sharper.
                  </p>
                </div>
                {panelExpanded ? (
                  <ChevronDown className="h-5 w-5 text-neutral-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-neutral-500 shrink-0" />
                )}
              </button>

              {panelExpanded && (
                <div className="space-y-4 mt-4 pt-4 border-t">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 text-sm font-medium text-neutral-200">Round Number</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={panelRoundNumber}
                        onChange={(e) => setPanelRoundNumber(parseInt(e.target.value) || 1)}
                        className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <p className="mt-1 text-xs text-neutral-500">Which round is this? (1st, 2nd, 3rd...)</p>
                    </div>
                  </div>

                  {/* Panel Members */}
                  <div className="space-y-3">
                    {panelMembers.map((member, idx) => (
                      <div key={idx} className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-neutral-200">Panelist {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removePanelMember(idx)}
                            className="text-neutral-500 hover:text-red-500 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => updatePanelMember(idx, "name", e.target.value)}
                            placeholder="Name (e.g., Jamie Torres)"
                            className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                          <input
                            type="text"
                            value={member.title}
                            onChange={(e) => updatePanelMember(idx, "title", e.target.value)}
                            placeholder="Title (e.g., VP Sales)"
                            className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                          <select
                            value={member.roleInMeeting}
                            onChange={(e) => updatePanelMember(idx, "roleInMeeting", e.target.value)}
                            className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                            className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                            className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPanelMember}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#333333] px-4 py-2.5 text-sm text-neutral-400 hover:border-emerald-500 hover:text-emerald-400 transition w-full justify-center"
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
            <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
              <h2 className="text-base font-semibold text-white mb-1">Account Context</h2>
              <p className="text-sm text-neutral-400 mb-4">
                {isDeal
                  ? "Describe the deal situation: where it stands, what you're stuck on, what you need to close."
                  : "What are you selling? Any context about this account or prospect that would help?"}
              </p>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                  <FileText className="h-3.5 w-3.5 text-neutral-500" />
                  {isDeal ? "Deal Context" : "Account / Product Context"}
                </label>
                <VoiceTextarea
                  value={jobDescription}
                  onChange={setJobDescription}
                  rows={6}
                  placeholder={
                    isDeal
                      ? "e.g., 'Stage 3, $180K ACV. Champion is VP Ops (Maria Torres), but CFO (Dave Kim) is the economic buyer and hasn't been engaged yet. Stuck because they want a 90-day pilot but we need a 12-month commit to hit pricing.'"
                      : "e.g., 'Selling our procurement platform to their COO. They currently use SAP Ariba but their mid-market division is underserved. I know they had a failed implementation with Coupa last year. LinkedIn shows they just hired a new VP of Supply Chain.'"
                  }
                />
              </div>
            </div>
          )}

          {/* Case Studies — all tools except interview outreach */}
          {toolId !== "interview_outreach" && (
            <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
              <h2 className="text-base font-semibold text-white mb-1">Customer Stories &amp; Case Studies</h2>
              <p className="text-sm text-neutral-400 mb-4">
                {isInterview
                  ? "Paste case studies or customer wins you can reference during your interview. Strong candidates weave in proof points to demonstrate impact."
                  : "Paste any case studies, customer wins, or proof points you want referenced in your outreach and materials. The more specific the better: include metrics, customer names, and outcomes."}
              </p>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                  <FileText className="h-3.5 w-3.5 text-neutral-500" />
                  Case Studies (optional)
                </label>
                <VoiceTextarea
                  value={caseStudies}
                  onChange={setCaseStudies}
                  rows={6}
                  placeholder={"Example:\n\nAccenture - Reduced procurement cycle time by 40% in 6 months. $2.3M annual savings. VP of Procurement quoted: \"This transformed how we buy.\"\n\nDeloitte - 3x pipeline coverage in Q1 after deploying our platform across 12 practice areas. Expanded from pilot to enterprise in 90 days."}
                />
                <p className="mt-1.5 text-xs text-neutral-500">
                  {isInterview
                    ? "These will be available for your interview prep materials and practice persona."
                    : "These will be woven into your outreach sequence, POV deck, and context file as social proof."}
                </p>
              </div>
            </div>
          )}

          {/* Document Upload */}
          <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <h2 className="text-base font-semibold text-white mb-1">Upload Documents</h2>
            <p className="text-sm text-neutral-400 mb-4">
              {isInterview
                ? "Upload your resume, the assignment, case studies, or any other prep materials. PDF, DOCX, or TXT."
                : "Upload relevant documents: proposals, case studies, prior decks, or any reference material. PDF, DOCX, or TXT."}
            </p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#333333] px-4 py-6 text-sm text-neutral-400 hover:border-emerald-500 hover:text-emerald-400 transition">
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Click to upload (PDF, DOCX, TXT, max 5MB)
                </>
              )}
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {uploadError && (
              <p className="mt-2 text-xs text-red-500">{uploadError}</p>
            )}
            {uploadedDocs.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">{doc.fileName}</span>
                      <span className="text-emerald-400">({Math.round(doc.text.length / 1000)}K chars extracted)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUploadedDoc(idx)}
                      className="text-emerald-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                <MessageSquare className="h-3.5 w-3.5 text-neutral-500" />
                Additional Notes (optional)
              </label>
              <VoiceTextarea
                value={additionalNotes}
                onChange={setAdditionalNotes}
                rows={3}
                placeholder={"e.g., 'Focus on how we handle enterprise security requirements. Their CISO will likely be involved. Also, they're a Gong customer so reference that integration if relevant.'"}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              This will use 1 blitz from your balance.
            </p>
            <button
              type="submit"
              disabled={submitting || !targetCompany}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Start Blitz
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
