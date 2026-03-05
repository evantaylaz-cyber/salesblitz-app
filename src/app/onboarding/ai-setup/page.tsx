"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  BookOpen,
  ClipboardPaste,
  MessageSquare,
  FileText,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { QUICK_INTERVIEW_PROMPTS, ONE_SHOT_PROMPT } from "@/lib/onboarding-prompts";
import type { ParsedProfileData } from "@/lib/parse-ai-profile";

type Method = "quick_interview" | "one_shot" | null;
type WizardStep = "choose" | "prompts" | "review" | "knowledge_base";

interface KBPreview {
  title: string;
  content: string;
  category: string;
  preview: string;
  enabled: boolean;
}

export default function AISetupPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("choose");
  const [method, setMethod] = useState<Method>(null);

  // Prompt flow state
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [pastedTexts, setPastedTexts] = useState<Record<string, string>>({});
  const [pasteInput, setPasteInput] = useState("");
  const [copied, setCopied] = useState(false);

  // Parse state
  const [parsing, setParsing] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<ParsedProfileData>({});
  const [confidence, setConfidence] = useState(0);

  // Review state — editable fields
  const [reviewData, setReviewData] = useState<ParsedProfileData>({});

  // KB state
  const [kbDocs, setKBDocs] = useState<KBPreview[]>([]);
  const [generatingKB, setGeneratingKB] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingKB, setSavingKB] = useState(false);
  const [expandedKB, setExpandedKB] = useState<number | null>(null);

  // Load existing profile on mount
  const [existingProfile, setExistingProfile] = useState<ParsedProfileData>({});
  useEffect(() => {
    if (isLoaded && clerkUser) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setExistingProfile(data.profile);
          }
        })
        .catch(() => {});
    }
  }, [isLoaded, clerkUser]);

  // Copy prompt to clipboard
  async function copyPrompt(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Parse pasted AI output
  async function handleParse(rawText: string, promptId?: string) {
    setParsing(true);
    setParseErrors([]);

    try {
      const res = await fetch("/api/profile/parse-ai-output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, promptType: method }),
      });

      const result = await res.json();

      if (result.errors?.length > 0) {
        setParseErrors(result.errors);
      }

      if (result.parsed && Object.keys(result.parsed).length > 0) {
        setParsedData((prev) => ({ ...prev, ...result.parsed }));
        setConfidence(result.confidence);

        if (promptId) {
          setPastedTexts((prev) => ({ ...prev, [promptId]: rawText }));
        }
      }
    } catch {
      setParseErrors(["Failed to parse. Please try again."]);
    } finally {
      setParsing(false);
    }
  }

  // Move to review step with merged data
  function goToReview() {
    // Merge parsed into existing, preferring parsed
    const merged: ParsedProfileData = { ...existingProfile };
    for (const [key, value] of Object.entries(parsedData)) {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value) && value.length === 0) continue;
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    setReviewData(merged);
    setStep("review");
  }

  // Save profile
  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData),
      });
      if (res.ok) {
        // Generate KB previews
        await generateKBPreviews();
        setStep("knowledge_base");
      }
    } catch {
      alert("Failed to save profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  // Generate KB previews
  async function generateKBPreviews() {
    setGeneratingKB(true);
    try {
      const res = await fetch("/api/profile/auto-generate-kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileData: reviewData }),
      });
      const data = await res.json();
      if (data.documents) {
        setKBDocs(data.documents.map((d: KBPreview) => ({ ...d, enabled: true })));
      }
    } catch {
      // Non-fatal — user can skip KB
    } finally {
      setGeneratingKB(false);
    }
  }

  // Save enabled KB docs
  async function saveKBDocs() {
    setSavingKB(true);
    const enabled = kbDocs.filter((d) => d.enabled);

    try {
      for (const doc of enabled) {
        await fetch("/api/knowledge-base", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: doc.title,
            content: doc.content,
            category: doc.category,
          }),
        });
      }

      // Mark onboarding as completed
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: true }),
      });

      router.push("/profile?setup=complete");
    } catch {
      alert("Failed to save knowledge base. Please try again.");
    } finally {
      setSavingKB(false);
    }
  }

  // Skip KB and finish
  async function skipKB() {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingCompleted: true }),
    });
    router.push("/profile?setup=complete");
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Step progress
  const steps: { id: WizardStep; label: string }[] = [
    { id: "choose", label: "Method" },
    { id: "prompts", label: "Extract" },
    { id: "review", label: "Review" },
    { id: "knowledge_base", label: "Knowledge Base" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">AI Profile Setup</span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="mx-auto max-w-4xl px-6 py-4">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  i <= currentStepIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i < currentStepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-sm ${
                  i <= currentStepIndex ? "text-gray-900 font-medium" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    i < currentStepIndex ? "bg-indigo-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 pb-12">
        {/* STEP 1: Choose method */}
        {step === "choose" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Set Up Your Profile with AI
              </h1>
              <p className="text-gray-500 max-w-lg mx-auto">
                Use your own ChatGPT, Claude, or Gemini to extract your professional context.
                Copy a prompt, run it in your AI, then paste the output back here.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-8">
              {/* Quick Interview */}
              <button
                onClick={() => {
                  setMethod("quick_interview");
                  setStep("prompts");
                }}
                className="rounded-xl border-2 bg-white p-6 text-left hover:border-indigo-300 hover:shadow-md transition group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Quick Interview</h3>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  5 focused prompts, one topic at a time. The AI interviews you conversationally, then outputs JSON you paste back.
                </p>
                <div className="flex items-center text-sm text-indigo-600 font-medium">
                  Recommended for first-timers
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </button>

              {/* One-Shot */}
              <button
                onClick={() => {
                  setMethod("one_shot");
                  setStep("prompts");
                }}
                className="rounded-xl border-2 bg-white p-6 text-left hover:border-indigo-300 hover:shadow-md transition group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-gray-100 transition">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">One-Shot Paste</h3>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Single mega-prompt that covers everything. One conversation, one paste. Faster but requires more upfront effort.
                </p>
                <div className="flex items-center text-sm text-gray-500 font-medium">
                  For experienced users
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Prompts */}
        {step === "prompts" && method === "quick_interview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setStep("choose");
                  setMethod(null);
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Change method
              </button>
              <span className="text-sm text-gray-400">
                Prompt {currentPromptIndex + 1} of {QUICK_INTERVIEW_PROMPTS.length}
              </span>
            </div>

            {/* Current prompt */}
            {(() => {
              const prompt = QUICK_INTERVIEW_PROMPTS[currentPromptIndex];
              const hasPasted = !!pastedTexts[prompt.id];
              return (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {prompt.title}
                    </h2>
                    <p className="text-sm text-gray-500">{prompt.description}</p>
                  </div>

                  {/* Prompt to copy */}
                  <div className="rounded-lg border bg-gray-900 text-gray-100 p-4 relative">
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => copyPrompt(prompt.prompt)}
                        className="flex items-center gap-1.5 rounded-md bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600 transition"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy Prompt
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-sm whitespace-pre-wrap pr-24 max-h-60 overflow-y-auto">
                      {prompt.prompt}
                    </pre>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">1</span>
                    Copy the prompt above
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600 ml-3">2</span>
                    Run it in ChatGPT, Claude, or Gemini
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600 ml-3">3</span>
                    Paste the final JSON output below
                  </div>

                  {/* Paste area */}
                  <div>
                    <textarea
                      value={pasteInput}
                      onChange={(e) => setPasteInput(e.target.value)}
                      placeholder="Paste the AI's JSON output here..."
                      rows={8}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  {/* Parse errors */}
                  {parseErrors.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          {parseErrors.map((e, i) => (
                            <p key={i}>{e}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success indicator */}
                  {hasPasted && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <Check className="h-4 w-4" />
                        Parsed successfully
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (currentPromptIndex > 0) {
                          setCurrentPromptIndex(currentPromptIndex - 1);
                          setPasteInput(pastedTexts[QUICK_INTERVIEW_PROMPTS[currentPromptIndex - 1].id] || "");
                          setParseErrors([]);
                        }
                      }}
                      disabled={currentPromptIndex === 0}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          await handleParse(pasteInput, prompt.id);
                          // Auto-advance if more prompts
                          if (currentPromptIndex < QUICK_INTERVIEW_PROMPTS.length - 1) {
                            setCurrentPromptIndex(currentPromptIndex + 1);
                            setPasteInput("");
                            setParseErrors([]);
                          }
                        }}
                        disabled={!pasteInput.trim() || parsing}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {parsing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ClipboardPaste className="h-4 w-4" />
                        )}
                        {currentPromptIndex < QUICK_INTERVIEW_PROMPTS.length - 1
                          ? "Parse & Next"
                          : "Parse"}
                      </button>

                      {/* Skip to review after any successful parse */}
                      {Object.keys(pastedTexts).length > 0 && (
                        <button
                          onClick={goToReview}
                          className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                          Review
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Prompt completion indicators */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {QUICK_INTERVIEW_PROMPTS.map((p, i) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setCurrentPromptIndex(i);
                          setPasteInput(pastedTexts[p.id] || "");
                          setParseErrors([]);
                        }}
                        className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
                          pastedTexts[p.id]
                            ? "bg-green-100 text-green-700"
                            : i === currentPromptIndex
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {pastedTexts[p.id] ? (
                          <Check className="h-3 w-3" />
                        ) : null}
                        {p.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* One-Shot prompt flow */}
        {step === "prompts" && method === "one_shot" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setStep("choose");
                  setMethod(null);
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Change method
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                One-Shot Profile Extraction
              </h2>
              <p className="text-sm text-gray-500">
                Copy this prompt into ChatGPT, Claude, or Gemini. Answer all the questions in one conversation, then paste the final JSON output below.
              </p>
            </div>

            {/* Prompt to copy */}
            <div className="rounded-lg border bg-gray-900 text-gray-100 p-4 relative">
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => copyPrompt(ONE_SHOT_PROMPT)}
                  className="flex items-center gap-1.5 rounded-md bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600 transition"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy Prompt
                    </>
                  )}
                </button>
              </div>
              <pre className="text-sm whitespace-pre-wrap pr-24 max-h-72 overflow-y-auto">
                {ONE_SHOT_PROMPT}
              </pre>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">1</span>
              Copy the prompt above
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600 ml-3">2</span>
              Complete the conversation in your AI
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600 ml-3">3</span>
              Paste the final JSON output below
            </div>

            {/* Paste area */}
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Paste the AI's final JSON output here..."
              rows={10}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
            />

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    {parseErrors.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={async () => {
                  setParsing(true);
                  setParseErrors([]);
                  try {
                    const res = await fetch("/api/profile/parse-ai-output", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ rawText: pasteInput, promptType: "one_shot" }),
                    });
                    const result = await res.json();
                    if (result.errors?.length > 0) {
                      setParseErrors(result.errors);
                    }
                    if (result.parsed && Object.keys(result.parsed).length > 0) {
                      setParsedData(result.parsed);
                      setConfidence(result.confidence);
                      // Merge and go to review directly
                      const merged: ParsedProfileData = { ...existingProfile };
                      for (const [key, value] of Object.entries(result.parsed)) {
                        if (value !== undefined && value !== null && value !== "") {
                          if (Array.isArray(value) && value.length === 0) continue;
                          (merged as Record<string, unknown>)[key] = value;
                        }
                      }
                      setReviewData(merged);
                      setStep("review");
                    }
                  } catch {
                    setParseErrors(["Failed to parse. Please try again."]);
                  } finally {
                    setParsing(false);
                  }
                }}
                disabled={!pasteInput.trim() || parsing}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {parsing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardPaste className="h-4 w-4" />
                )}
                Parse & Review
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review */}
        {step === "review" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Review Your Profile</h2>
              <p className="text-sm text-gray-500">
                Edit any fields before saving. {confidence > 0 && `Confidence: ${Math.round(confidence * 100)}%`}
              </p>
            </div>

            {/* Company section */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Company Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    value={reviewData.companyName || ""}
                    onChange={(e) => setReviewData({ ...reviewData, companyName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                  <input
                    value={reviewData.companyUrl || ""}
                    onChange={(e) => setReviewData({ ...reviewData, companyUrl: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product/Service</label>
                <textarea
                  value={reviewData.companyProduct || ""}
                  onChange={(e) => setReviewData({ ...reviewData, companyProduct: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Description</label>
                <textarea
                  value={reviewData.companyDescription || ""}
                  onChange={(e) => setReviewData({ ...reviewData, companyDescription: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Differentiators</label>
                <textarea
                  value={reviewData.companyDifferentiators || ""}
                  onChange={(e) => setReviewData({ ...reviewData, companyDifferentiators: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competitors</label>
                  <textarea
                    value={reviewData.companyCompetitors || ""}
                    onChange={(e) => setReviewData({ ...reviewData, companyCompetitors: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Market</label>
                  <textarea
                    value={reviewData.companyTargetMarket || ""}
                    onChange={(e) => setReviewData({ ...reviewData, companyTargetMarket: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* LinkedIn section */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">LinkedIn Profile</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About / Summary</label>
                <textarea
                  value={reviewData.linkedinAbout || ""}
                  onChange={(e) => setReviewData({ ...reviewData, linkedinAbout: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                <textarea
                  value={reviewData.linkedinExperience || ""}
                  onChange={(e) => setReviewData({ ...reviewData, linkedinExperience: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                <textarea
                  value={reviewData.linkedinEducation || ""}
                  onChange={(e) => setReviewData({ ...reviewData, linkedinEducation: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Deal Stories section */}
            {reviewData.dealStories && reviewData.dealStories.length > 0 && (
              <div className="rounded-xl border bg-white p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">
                  Deal Stories ({reviewData.dealStories.length})
                </h3>
                {reviewData.dealStories.map((story, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {story.title || story.customer || `Deal ${i + 1}`}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
                        <input
                          value={story.customer}
                          onChange={(e) => {
                            const updated = [...(reviewData.dealStories || [])];
                            updated[i] = { ...updated[i], customer: e.target.value };
                            setReviewData({ ...reviewData, dealStories: updated });
                          }}
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Metrics</label>
                        <input
                          value={story.metrics}
                          onChange={(e) => {
                            const updated = [...(reviewData.dealStories || [])];
                            updated[i] = { ...updated[i], metrics: e.target.value };
                            setReviewData({ ...reviewData, dealStories: updated });
                          }}
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Challenge</label>
                      <textarea
                        value={story.challenge}
                        onChange={(e) => {
                          const updated = [...(reviewData.dealStories || [])];
                          updated[i] = { ...updated[i], challenge: e.target.value };
                          setReviewData({ ...reviewData, dealStories: updated });
                        }}
                        rows={2}
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Result</label>
                      <textarea
                        value={story.result}
                        onChange={(e) => {
                          const updated = [...(reviewData.dealStories || [])];
                          updated[i] = { ...updated[i], result: e.target.value };
                          setReviewData({ ...reviewData, dealStories: updated });
                        }}
                        rows={2}
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Value Props section */}
            {reviewData.valueProps && reviewData.valueProps.length > 0 && (
              <div className="rounded-xl border bg-white p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">
                  Value Propositions ({reviewData.valueProps.length})
                </h3>
                {reviewData.valueProps.map((vp, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Headline</label>
                      <input
                        value={vp.headline}
                        onChange={(e) => {
                          const updated = [...(reviewData.valueProps || [])];
                          updated[i] = { ...updated[i], headline: e.target.value };
                          setReviewData({ ...reviewData, valueProps: updated });
                        }}
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                      <textarea
                        value={vp.description}
                        onChange={(e) => {
                          const updated = [...(reviewData.valueProps || [])];
                          updated[i] = { ...updated[i], description: e.target.value };
                          setReviewData({ ...reviewData, valueProps: updated });
                        }}
                        rows={2}
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Proof Point</label>
                      <input
                        value={vp.proofPoint}
                        onChange={(e) => {
                          const updated = [...(reviewData.valueProps || [])];
                          updated[i] = { ...updated[i], proofPoint: e.target.value };
                          setReviewData({ ...reviewData, valueProps: updated });
                        }}
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Methodology section */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Sales Methodology</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Style</label>
                  <input
                    value={reviewData.sellingStyle || ""}
                    onChange={(e) => setReviewData({ ...reviewData, sellingStyle: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Tone</label>
                  <input
                    value={reviewData.preferredTone || ""}
                    onChange={(e) => setReviewData({ ...reviewData, preferredTone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("prompts")}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to prompts
              </button>
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save & Generate Knowledge Base
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Knowledge Base */}
        {step === "knowledge_base" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Auto-Generated Knowledge Base
              </h2>
              <p className="text-sm text-gray-500">
                Based on your profile, we&apos;ve generated starter documents for your knowledge base.
                Toggle off any you don&apos;t want, then save.
              </p>
            </div>

            {generatingKB ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-sm text-gray-500">Generating knowledge base documents...</p>
                </div>
              </div>
            ) : kbDocs.length === 0 ? (
              <div className="rounded-xl border bg-white p-8 text-center">
                <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  Not enough profile data to auto-generate KB docs. You can add them manually later from your profile page.
                </p>
                <button
                  onClick={skipKB}
                  className="mt-4 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
                >
                  Finish Setup
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {kbDocs.map((doc, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border bg-white transition ${
                        doc.enabled ? "border-gray-200" : "border-gray-100 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={() => {
                              const updated = [...kbDocs];
                              updated[i] = { ...updated[i], enabled: !updated[i].enabled };
                              setKBDocs(updated);
                            }}
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                              doc.enabled
                                ? "border-indigo-600 bg-indigo-600"
                                : "border-gray-300"
                            }`}
                          >
                            {doc.enabled && <Check className="h-3 w-3 text-white" />}
                          </button>
                          <div>
                            <span className="font-medium text-gray-900">{doc.title}</span>
                            <span className="ml-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                              {doc.category.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setExpandedKB(expandedKB === i ? null : i)
                          }
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedKB === i ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {expandedKB === i && (
                        <div className="border-t px-5 py-4">
                          <pre className="text-sm text-gray-600 whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {doc.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={skipKB}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Skip — I&apos;ll add docs later
                  </button>
                  <button
                    onClick={saveKBDocs}
                    disabled={savingKB || kbDocs.filter((d) => d.enabled).length === 0}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {savingKB ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    Save {kbDocs.filter((d) => d.enabled).length} Documents & Finish
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
