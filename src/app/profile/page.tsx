"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Building2,
  User,
  Target,
  BookOpen,
  Save,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  AlertCircle,
  Globe,
  Sparkles,
  LinkIcon,
  Briefcase,
  MapPin,
  Pen,
  Users,
  FileText,
  Upload,
  Shield,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import VoiceTextarea from "@/components/VoiceTextarea";

interface DealStory {
  title: string;
  customer: string;
  challenge: string;
  solution: string;
  result: string;
  metrics: string;
  sourceUrl: string;
}

interface ValueProp {
  headline: string;
  description: string;
  proofPoint: string;
}

interface ICPDefinition {
  industry: string;
  companySize: string;
  buyerPersona: string;
  commonPains: string;
}

interface CaseStudy {
  customerName: string;
  industry: string;
  challenge: string;
  solution: string;
  result: string;
  quote: string;
}

interface ProfileData {
  companyName: string;
  companyProduct: string;
  companyDescription: string;
  companyDifferentiators: string;
  companyCompetitors: string;
  companyTargetMarket: string;
  companyUrl: string;
  linkedinAbout: string;
  linkedinExperience: string;
  linkedinEducation: string;
  sellingStyle: string;
  sellingPhilosophy: string;
  sellerArchetype: string;
  dealStories: DealStory[];
  valueProps: ValueProp[];
  caseStudies: CaseStudy[];
  icpDefinitions: ICPDefinition[];
  preferredTone: string;
  onboardingCompleted: boolean;
  // Resume (goldmine)
  resumeText: string;
  // Career & Territory (Layer 3)
  careerNarrative: string;
  keyStrengths: string[];
  targetRoleTypes: string[];
  lifecycleStage: string;
  territoryFocus: string;
  currentQuotaContext: string;
  // Writing Style (Layer 4)
  writingStyle: string;
  bannedPhrases: string[];
  signaturePatterns: string[];
  // Depth tracking
  onboardingDepth: number;
  // Data retention & recording consent
  transcriptRetentionDays: number;
  recordingConsentAcknowledgedAt: string | null;
}

const EMPTY_DEAL_STORY: DealStory = {
  title: "",
  customer: "",
  challenge: "",
  solution: "",
  result: "",
  metrics: "",
  sourceUrl: "",
};

const EMPTY_VALUE_PROP: ValueProp = {
  headline: "",
  description: "",
  proofPoint: "",
};

const EMPTY_ICP: ICPDefinition = {
  industry: "",
  companySize: "",
  buyerPersona: "",
  commonPains: "",
};

const EMPTY_CASE_STUDY: CaseStudy = {
  customerName: "",
  industry: "",
  challenge: "",
  solution: "",
  result: "",
  quote: "",
};

const DEFAULT_PROFILE: ProfileData = {
  companyName: "",
  companyProduct: "",
  companyDescription: "",
  companyDifferentiators: "",
  companyCompetitors: "",
  companyTargetMarket: "",
  companyUrl: "",
  linkedinAbout: "",
  linkedinExperience: "",
  linkedinEducation: "",
  sellingStyle: "Value Messaging",
  sellingPhilosophy: "",
  sellerArchetype: "",
  dealStories: [],
  valueProps: [],
  caseStudies: [],
  icpDefinitions: [],
  preferredTone: "professional",
  onboardingCompleted: false,
  resumeText: "",
  careerNarrative: "",
  keyStrengths: [],
  targetRoleTypes: [],
  lifecycleStage: "",
  territoryFocus: "",
  currentQuotaContext: "",
  writingStyle: "",
  bannedPhrases: [],
  signaturePatterns: [],
  onboardingDepth: 0,
  transcriptRetentionDays: 90,
  recordingConsentAcknowledgedAt: null,
};

function CollapsibleSection({
  title,
  icon: Icon,
  description,
  children,
  defaultOpen = false,
  completionPct,
}: {
  title: string;
  icon: React.ElementType;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  completionPct?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-[#141414] shadow-sm shadow-black/20 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-[#0a0a0a] transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Icon className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-neutral-400">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {completionPct !== undefined && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-20 rounded-full bg-[#1a1a1a]">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${completionPct}%`,
                    backgroundColor:
                      completionPct === 100
                        ? "#10b981"
                        : completionPct > 50
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                />
              </div>
              <span className="text-xs text-neutral-500">{completionPct}%</span>
            </div>
          )}
          {open ? (
            <ChevronDown className="h-5 w-5 text-neutral-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-neutral-500" />
          )}
        </div>
      </button>
      {open && <div className="border-t px-6 py-5">{children}</div>}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required = false,
  error = "",
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-200 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-[#0a0a0a] text-white placeholder-neutral-500 px-3 py-2 text-sm focus:ring-1 outline-none transition ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-[#333333] focus:border-emerald-500 focus:ring-emerald-500"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
  required = false,
  error = "",
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  required?: boolean;
  error?: string;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-200 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className={error ? "rounded-lg border border-red-500" : ""}>
        <VoiceTextarea
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

interface ValidationErrors {
  [key: string]: string;
}

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // URL fetch states
  const [fetchingCompany, setFetchingCompany] = useState(false);
  const [fetchCompanyError, setFetchCompanyError] = useState<string | null>(null);
  const [fetchingStoryUrl, setFetchingStoryUrl] = useState<number | null>(null);
  // Resume parsing states
  const [parsingResume, setParsingResume] = useState(false);
  const [resumeParseResult, setResumeParseResult] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const resumeFileRef = useRef<HTMLInputElement>(null);
  // Data retention states
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  function validateField(fieldName: string, value: unknown): string {
    if (typeof value !== "string") return "";

    const trimmed = value.trim();

    if (fieldName === "companyName") {
      if (!trimmed) return "Company name is required";
      if (trimmed.length < 2) return "Company name must be at least 2 characters";
    }

    if (fieldName === "companyProduct") {
      if (!trimmed) return "Product or service is required";
      if (trimmed.length < 10) return "Please provide a more detailed description (at least 10 characters)";
    }

    return "";
  }

  function validateAllRequired(): ValidationErrors {
    const errors: ValidationErrors = {};

    if (!profile.companyName.trim()) {
      errors.companyName = "Company name is required";
    } else if (profile.companyName.trim().length < 2) {
      errors.companyName = "Company name must be at least 2 characters";
    }

    if (!profile.companyProduct.trim()) {
      errors.companyProduct = "Product or service is required";
    } else if (profile.companyProduct.trim().length < 10) {
      errors.companyProduct = "Please provide a more detailed description";
    }

    return errors;
  }

  function isFormValid(): boolean {
    return !profile.companyName.trim() || !profile.companyProduct.trim();
  }

  function handleFieldBlur(fieldName: string) {
    setTouchedFields((prev) => new Set([...prev, fieldName]));
    const value = profile[fieldName as keyof ProfileData];
    const fieldError = validateField(fieldName, value);

    if (fieldError) {
      setValidationErrors((prev) => ({ ...prev, [fieldName]: fieldError }));
    } else {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }

  useEffect(() => {
    if (isLoaded && clerkUser) {
      fetchProfile();
    }
  }, [isLoaded, clerkUser?.id]);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile({
            ...DEFAULT_PROFILE,
            ...data.profile,
            dealStories: Array.isArray(data.profile.dealStories)
              ? data.profile.dealStories
              : [],
            valueProps: Array.isArray(data.profile.valueProps)
              ? data.profile.valueProps
              : [],
            keyStrengths: Array.isArray(data.profile.keyStrengths)
              ? data.profile.keyStrengths
              : [],
            targetRoleTypes: Array.isArray(data.profile.targetRoleTypes)
              ? data.profile.targetRoleTypes
              : [],
            bannedPhrases: Array.isArray(data.profile.bannedPhrases)
              ? data.profile.bannedPhrases
              : [],
            signaturePatterns: Array.isArray(data.profile.signaturePatterns)
              ? data.profile.signaturePatterns
              : [],
            icpDefinitions: Array.isArray(data.profile.icpDefinitions)
              ? data.profile.icpDefinitions
              : [],
            caseStudies: Array.isArray(data.profile.caseStudies)
              ? data.profile.caseStudies
              : [],
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch profile:", e);
    } finally {
      setLoading(false);
    }
  }

  // Fetch company info from URL
  async function fetchCompanyFromUrl() {
    if (!profile.companyUrl) return;
    setFetchingCompany(true);
    setFetchCompanyError(null);
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: profile.companyUrl, type: "company_website" }),
      });
      const data = await res.json();
      if (res.ok && data.extracted) {
        const e = data.extracted;
        setProfile((prev) => ({
          ...prev,
          companyName: e.companyName || prev.companyName,
          companyProduct: e.companyProduct || prev.companyProduct,
          companyDescription: e.companyDescription || prev.companyDescription,
          companyDifferentiators: e.companyDifferentiators || prev.companyDifferentiators,
          companyCompetitors: e.companyCompetitors || prev.companyCompetitors,
          companyTargetMarket: e.companyTargetMarket || prev.companyTargetMarket,
        }));
      } else {
        setFetchCompanyError(data.error || "Failed to extract company info");
      }
    } catch {
      setFetchCompanyError("Network error");
    } finally {
      setFetchingCompany(false);
    }
  }

  // Fetch deal story from URL
  async function fetchDealStoryFromUrl(index: number) {
    const story = profile.dealStories[index];
    if (!story?.sourceUrl) return;
    setFetchingStoryUrl(index);
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: story.sourceUrl, type: "deal_story" }),
      });
      const data = await res.json();
      if (res.ok && data.extracted) {
        const e = data.extracted;
        setProfile((prev) => ({
          ...prev,
          dealStories: prev.dealStories.map((s, i) =>
            i === index
              ? {
                  ...s,
                  title: e.title || s.title,
                  customer: e.customer || s.customer,
                  challenge: e.challenge || s.challenge,
                  solution: e.solution || s.solution,
                  result: e.result || s.result,
                  metrics: e.metrics || s.metrics,
                }
              : s
          ),
        }));
      }
    } catch {
      // Silent fail — user can still fill manually
    } finally {
      setFetchingStoryUrl(null);
    }
  }

  // Parse resume: sends resume text to API, auto-fills career fields
  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setResumeParseResult("File too large. Please upload a file under 5MB.");
      if (resumeFileRef.current) resumeFileRef.current.value = "";
      return;
    }
    setUploadingResume(true);
    setResumeParseResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        updateField("resumeText", data.text);
        setResumeParseResult(`Extracted ${data.charCount.toLocaleString()} characters from ${data.fileName}. Click "Extract Career Data" to auto-fill your profile.`);
      } else {
        setResumeParseResult(data.error || "Failed to process file.");
      }
    } catch {
      setResumeParseResult("Upload failed. Try pasting your resume instead.");
    } finally {
      setUploadingResume(false);
      if (resumeFileRef.current) resumeFileRef.current.value = "";
    }
  }

  async function parseResume() {
    if (!profile.resumeText || profile.resumeText.trim().length < 50) return;
    setParsingResume(true);
    setResumeParseResult(null);
    try {
      const res = await fetch("/api/profile/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: profile.resumeText }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Auto-fill profile fields from parsed resume
        setProfile((prev) => ({
          ...prev,
          careerNarrative: data.careerNarrative || prev.careerNarrative,
          sellerArchetype: data.sellerArchetype || prev.sellerArchetype,
          keyStrengths: data.keyStrengths?.length ? data.keyStrengths : prev.keyStrengths,
          targetRoleTypes: data.targetRoleTypes?.length ? data.targetRoleTypes : prev.targetRoleTypes,
          linkedinExperience: data.linkedinExperience || prev.linkedinExperience,
          linkedinEducation: data.education || prev.linkedinEducation,
        }));
        const parts = [];
        if (data.careerNarrative) parts.push("career narrative");
        if (data.sellerArchetype) parts.push("seller archetype");
        if (data.keyStrengths?.length) parts.push(`${data.keyStrengths.length} strengths`);
        if (data.dealStoriesFound > 0) parts.push(`${data.dealStoriesFound} potential deal stories`);
        setResumeParseResult(`Extracted: ${parts.join(", ")}. Review the fields below.`);
      } else {
        setResumeParseResult(data.error || "Failed to parse resume");
      }
    } catch {
      setResumeParseResult("Network error. Try again.");
    } finally {
      setParsingResume(false);
    }
  }

  const saveProfile = useCallback(async () => {
    // Validate required fields
    const errors = validateAllRequired();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setTouchedFields(new Set(Object.keys(errors)));
      setError(null);
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          onboardingCompleted: true,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setProfile((prev) => ({ ...prev, onboardingCompleted: true }));
        setValidationErrors({});
        setTouchedFields(new Set());
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save profile. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [profile]);

  async function purgeAllTranscripts() {
    if (!confirm("This will permanently delete all meeting transcripts. Coaching scores and analysis summaries will be preserved. Continue?")) return;
    setPurging(true);
    setPurgeResult(null);
    try {
      const res = await fetch("/api/account/purge-recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setPurgeResult(`Done. Purged transcript data from ${data.purged} recording(s).`);
      } else {
        setPurgeResult(data.error || "Purge failed.");
      }
    } catch {
      setPurgeResult("Network error.");
    } finally {
      setPurging(false);
    }
  }

  function updateField(field: keyof ProfileData, value: unknown) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  // Completion tracking
  function getCompanyCompletion(): number {
    const fields = [
      profile.companyName,
      profile.companyProduct,
      profile.companyDescription,
      profile.companyDifferentiators,
      profile.companyCompetitors,
    ];
    const filled = fields.filter((f) => f && f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }

  function getLinkedinCompletion(): number {
    const fields = [
      profile.linkedinAbout,
      profile.linkedinExperience,
      profile.linkedinEducation,
    ];
    const filled = fields.filter((f) => f && f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }

  function getSalesCompletion(): number {
    let score = 0;
    const total = 3;
    if (profile.sellingStyle) score++;
    if (profile.dealStories.length > 0) score++;
    if (profile.valueProps.length > 0) score++;
    return Math.round((score / total) * 100);
  }

  // Deal story management
  function addDealStory() {
    setProfile((prev) => ({
      ...prev,
      dealStories: [...prev.dealStories, { ...EMPTY_DEAL_STORY }],
    }));
  }

  function updateDealStory(index: number, field: keyof DealStory, value: string) {
    setProfile((prev) => ({
      ...prev,
      dealStories: prev.dealStories.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  }

  function removeDealStory(index: number) {
    setProfile((prev) => ({
      ...prev,
      dealStories: prev.dealStories.filter((_, i) => i !== index),
    }));
  }

  // Value prop management
  function addValueProp() {
    setProfile((prev) => ({
      ...prev,
      valueProps: [...prev.valueProps, { ...EMPTY_VALUE_PROP }],
    }));
  }

  function updateValueProp(index: number, field: keyof ValueProp, value: string) {
    setProfile((prev) => ({
      ...prev,
      valueProps: prev.valueProps.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  }

  function removeValueProp(index: number) {
    setProfile((prev) => ({
      ...prev,
      valueProps: prev.valueProps.filter((_, i) => i !== index),
    }));
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav currentPage="/profile" />

      {/* Profile action bar */}
      <div className="border-b bg-[#141414] sticky top-[57px] z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <h1 className="text-lg font-bold text-white">Your Profile</h1>
          <div className="flex items-center gap-3">
            <a
              href="/onboarding-chat"
              className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/100/15"
            >
              <Sparkles className="h-4 w-4" />
              Fill with AI
            </a>
            <button
              onClick={saveProfile}
              disabled={saving || isFormValid()}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Profile"}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Intro banner */}
        {!profile.onboardingCompleted && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <AlertCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-emerald-300">
                We'll do the heavy lifting
              </p>
              <p className="mt-1 text-sm text-emerald-400">
                Drop your company website below and hit Auto-Fill. We&apos;ll research your company, competitors, and market.
                You just verify what we found.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400 flex items-start gap-3">
            <Check className="h-5 w-5 mt-0.5 shrink-0" />
            <span>Profile saved successfully!</span>
          </div>
        )}

        <div className="space-y-4">
          {/* SECTION 1: Company Context */}
          <CollapsibleSection
            title="Your Company"
            icon={Building2}
            description="Paste your website. We'll extract the rest."
            defaultOpen={!profile.onboardingCompleted}
            completionPct={getCompanyCompletion()}
          >
            <div className="space-y-4">
              {/* Company URL with fetch button */}
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Company Website
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={profile.companyUrl}
                    onChange={(e) => updateField("companyUrl", e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="flex-1 rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
                  />
                  <button
                    onClick={fetchCompanyFromUrl}
                    disabled={!profile.companyUrl || fetchingCompany}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/100/15 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                  >
                    {fetchingCompany ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {fetchingCompany ? "Fetching..." : "Auto-Fill"}
                  </button>
                </div>
                {fetchCompanyError && (
                  <p className="mt-1 text-xs text-red-500">{fetchCompanyError}</p>
                )}
                <p className="mt-1 text-xs text-neutral-500">
                  We&apos;ll pull your company info automatically. Review and edit below.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInput
                  label="Company Name"
                  value={profile.companyName}
                  onChange={(v) => updateField("companyName", v)}
                  onBlur={() => handleFieldBlur("companyName")}
                  placeholder="Acme Corp"
                  required
                  error={touchedFields.has("companyName") ? validationErrors.companyName : ""}
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-200 mb-1">
                    Preferred Tone
                  </label>
                  <select
                    value={profile.preferredTone}
                    onChange={(e) => updateField("preferredTone", e.target.value)}
                    className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="professional">Professional</option>
                    <option value="conversational">Conversational</option>
                    <option value="direct">Direct</option>
                    <option value="consultative">Consultative</option>
                  </select>
                </div>
              </div>
              <TextArea
                label="Product / Service"
                value={profile.companyProduct}
                onChange={(v) => updateField("companyProduct", v)}
                onBlur={() => handleFieldBlur("companyProduct")}
                placeholder="What does your company sell? Be specific."
                hint="e.g., 'Sentinel: an EDR platform for mid-market enterprises'"
                required
                error={touchedFields.has("companyProduct") ? validationErrors.companyProduct : ""}
              />
              <TextArea
                label="Company Description"
                value={profile.companyDescription}
                onChange={(v) => updateField("companyDescription", v)}
                placeholder="e.g., 'Gong captures customer interactions across phone, email, and web, then uses AI to surface deal risks, coaching moments, and revenue intelligence for B2B sales teams.'"
              />
              <TextArea
                label="Key Differentiators"
                value={profile.companyDifferentiators}
                onChange={(v) => updateField("companyDifferentiators", v)}
                placeholder="e.g., 'Only platform that captures all customer interactions (not just calls). Proprietary AI models trained on 4B+ sales conversations. Real-time deal intelligence vs. retroactive CRM data entry.'"
              />
              <TextArea
                label="Main Competitors"
                value={profile.companyCompetitors}
                onChange={(v) => updateField("companyCompetitors", v)}
                placeholder="Top 3-5 competitors. We'll use these in competitive research."
                hint="e.g., 'CrowdStrike, SentinelOne, Microsoft Defender'"
              />
              <TextArea
                label="Target Market"
                value={profile.companyTargetMarket}
                onChange={(v) => updateField("companyTargetMarket", v)}
                placeholder="e.g., 'B2B SaaS companies with 50-5000 employees. Primary buyers: VP Sales, CRO, RevOps leaders. Sweet spot: companies with 20+ AEs doing complex deals.'"
                rows={2}
              />
            </div>
          </CollapsibleSection>

          {/* SECTION 2: Your LinkedIn */}
          <CollapsibleSection
            title="Your LinkedIn"
            icon={User}
            description="Your background. Used to position you in deliverables."
            completionPct={getLinkedinCompletion()}
          >
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                Paste sections from your own LinkedIn profile. This helps us
                position you credibly in context files and POV decks.
              </p>
              <TextArea
                label="About / Summary"
                value={profile.linkedinAbout}
                onChange={(v) => updateField("linkedinAbout", v)}
                placeholder="e.g., 'Enterprise AE with 10+ years selling platform solutions to F500. 5x President's Club, $25M+ career closed. I specialize in complex, multi-stakeholder deals in highly competitive markets.'"
                rows={4}
              />
              <TextArea
                label="Experience"
                value={profile.linkedinExperience}
                onChange={(v) => updateField("linkedinExperience", v)}
                placeholder="e.g., 'Senior Enterprise AE, TechCo (2022-Present): $3.2M quota, 142% attainment. Closed largest net-new deal in segment ($1.1M ACV). Enterprise AE, PlatformCo (2018-2022): Named accounts, $2.5M avg quota.'"
                rows={5}
                hint="Paste your last 2-3 roles. We'll use this to position you in deliverables."
              />
              <TextArea
                label="Education"
                value={profile.linkedinEducation}
                onChange={(v) => updateField("linkedinEducation", v)}
                placeholder="Paste your education section"
                rows={2}
              />
            </div>
          </CollapsibleSection>

          {/* SECTION: Resume (Goldmine) */}
          <CollapsibleSection
            title="Resume"
            icon={FileText}
            description="Paste your resume. We'll extract career data, deal stories, and strengths automatically."
            defaultOpen={!profile.resumeText}
            completionPct={profile.resumeText ? 100 : 0}
          >
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                Your resume is the fastest way to fill your profile. Upload a file or paste it below. We'll extract your career arc, key wins, seller archetype, and potential deal stories.
              </p>

              {/* File upload */}
              <div className="flex items-center gap-3">
                <input
                  ref={resumeFileRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleResumeUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <button
                  type="button"
                  onClick={() => resumeFileRef.current?.click()}
                  disabled={uploadingResume}
                  className="flex items-center gap-1.5 rounded-lg border border-[#333333] bg-[#141414] px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {uploadingResume ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingResume ? "Processing..." : "Upload Resume"}
                </button>
                <span className="text-xs text-neutral-500">PDF, DOCX, or TXT (max 5MB)</span>
              </div>

              <div className="relative">
                <div className="absolute inset-x-0 top-0 flex justify-center -translate-y-1/2">
                  <span className="bg-[#141414] px-2 text-xs text-neutral-500">or paste below</span>
                </div>
              </div>

              <VoiceTextarea
                value={profile.resumeText}
                onChange={(v: string) => updateField("resumeText", v)}
                placeholder="Paste your full resume text here. Include everything: summary, experience, education, skills, accomplishments..."
                rows={8}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={parseResume}
                  disabled={!profile.resumeText || profile.resumeText.trim().length < 50 || parsingResume}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/100/15 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {parsingResume ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {parsingResume ? "Parsing..." : "Extract Career Data"}
                </button>
                {resumeParseResult && (
                  <p className={`text-xs ${resumeParseResult.startsWith("Extracted") ? "text-emerald-400" : "text-red-500"}`}>
                    {resumeParseResult}
                  </p>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                This auto-fills your career narrative, archetype, strengths, experience, and identifies accomplishments that could become deal stories. You can edit everything after.
              </p>
            </div>
          </CollapsibleSection>

          {/* SECTION 3: Sales Methodology & Stories */}
          <CollapsibleSection
            title="Sales Methodology & Stories"
            icon={Target}
            description="Your framework, deal stories, and value props"
            completionPct={getSalesCompletion()}
          >
            <div className="space-y-6">
              {/* Selling style dropdown */}
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Sales Methodology
                </label>
                <select
                  value={profile.sellingStyle}
                  onChange={(e) => updateField("sellingStyle", e.target.value)}
                  className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="Value Messaging">Value Messaging</option>
                  <option value="Value Messaging + Deal Qualification">Value Messaging + Deal Qualification</option>
                  <option value="Challenger Sale">Challenger Sale</option>
                  <option value="SPIN Selling">SPIN Selling</option>
                  <option value="Sandler">Sandler</option>
                  <option value="Solution Selling">Solution Selling</option>
                  <option value="Consultative Selling">Consultative Selling</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Deal Stories */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-white">
                      Deal Stories
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Your best wins. Paste a case study link or fill in manually.
                    </p>
                  </div>
                  <button
                    onClick={addDealStory}
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/100/15 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Story
                  </button>
                </div>

                {profile.dealStories.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed border-[#262626] p-6 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-neutral-500" />
                    <p className="mt-2 text-sm text-neutral-400">
                      No deal stories yet. Add a link to a case study or type one in.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {profile.dealStories.map((story, i) => (
                    <div
                      key={i}
                      className="rounded-lg border bg-[#0a0a0a] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-neutral-500 uppercase">
                          Story {i + 1}
                        </span>
                        <button
                          onClick={() => removeDealStory(i)}
                          className="text-neutral-500 hover:text-red-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* URL fetch for this story */}
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={story.sourceUrl}
                          onChange={(e) =>
                            updateDealStory(i, "sourceUrl", e.target.value)
                          }
                          placeholder="Paste a case study or blog post URL..."
                          className="flex-1 rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                        <button
                          onClick={() => fetchDealStoryFromUrl(i)}
                          disabled={!story.sourceUrl || fetchingStoryUrl === i}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/100/15 disabled:opacity-50 transition whitespace-nowrap"
                        >
                          {fetchingStoryUrl === i ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {fetchingStoryUrl === i ? "..." : "Fetch"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          value={story.title}
                          onChange={(e) =>
                            updateDealStory(i, "title", e.target.value)
                          }
                          placeholder="e.g., 'Enterprise Cold to 7-Figure'"
                          className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                        <input
                          type="text"
                          value={story.customer}
                          onChange={(e) =>
                            updateDealStory(i, "customer", e.target.value)
                          }
                          placeholder="e.g., 'Acme Corp Managed Services'"
                          className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <VoiceTextarea
                        value={story.challenge}
                        onChange={(val) => updateDealStory(i, "challenge", val)}
                        placeholder="e.g., 'Managing 400+ locations with fragmented processes. Each site operated independently, no visibility into cost-per-unit across the portfolio.'"
                        rows={2}
                      />
                      <VoiceTextarea
                        value={story.solution}
                        onChange={(val) => updateDealStory(i, "solution", val)}
                        placeholder="e.g., 'Positioned our platform as the centralized hiring layer across all 400+ locations. Built CFO-level ROI case showing 40% cost reduction vs. their per-location agency model.'"
                        rows={2}
                      />
                      <VoiceTextarea
                        value={story.result}
                        onChange={(val) => updateDealStory(i, "result", val)}
                        placeholder="e.g., 'Closed at $180K initial ACV, expanded to $1M+ within 12 months. CPA dropped from $95 to $35 across their portfolio. Became their largest vendor in category.'"
                        rows={2}
                      />
                      <input
                        type="text"
                        value={story.metrics}
                        onChange={(e) =>
                          updateDealStory(i, "metrics", e.target.value)
                        }
                        placeholder="e.g., '$1M+ ACV, 63% CPA reduction, 400+ locations consolidated'"
                        className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Value Props */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-white">
                      Value Propositions
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Your core selling points: headline, detail, and proof
                    </p>
                  </div>
                  <button
                    onClick={addValueProp}
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/100/15 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Prop
                  </button>
                </div>

                {profile.valueProps.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed border-[#262626] p-6 text-center">
                    <Target className="mx-auto h-8 w-8 text-neutral-500" />
                    <p className="mt-2 text-sm text-neutral-400">
                      No value props yet. What are the top reasons customers
                      buy from you?
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {profile.valueProps.map((prop, i) => (
                    <div
                      key={i}
                      className="rounded-lg border bg-[#0a0a0a] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-neutral-500 uppercase">
                          Value Prop {i + 1}
                        </span>
                        <button
                          onClick={() => removeValueProp(i)}
                          className="text-neutral-500 hover:text-red-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={prop.headline}
                        onChange={(e) =>
                          updateValueProp(i, "headline", e.target.value)
                        }
                        placeholder="Headline (e.g., '60% faster time-to-detection')"
                        className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <VoiceTextarea
                        value={prop.description}
                        onChange={(val) => updateValueProp(i, "description", val)}
                        placeholder="Why this matters to the buyer"
                        rows={2}
                      />
                      <input
                        type="text"
                        value={prop.proofPoint}
                        onChange={(e) =>
                          updateValueProp(i, "proofPoint", e.target.value)
                        }
                        placeholder="Proof point (customer quote, stat, case study reference)"
                        className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* SECTION 4: Career & Territory */}
          <CollapsibleSection
            title="Career & Territory"
            icon={Briefcase}
            description="Your career arc, territory, and ICP"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Lifecycle Stage
                </label>
                <select
                  value={profile.lifecycleStage}
                  onChange={(e) => updateField("lifecycleStage", e.target.value)}
                  className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="ramping">Ramping</option>
                  <option value="selling">Selling</option>
                  <option value="managing">Managing</option>
                </select>
              </div>
              <TextArea
                label="Career Narrative"
                value={profile.careerNarrative}
                onChange={(v) => updateField("careerNarrative", v)}
                placeholder="2-3 sentence arc of your career path"
                hint="Used in interview prep and outreach positioning"
                rows={3}
              />
              <TextArea
                label="Selling Philosophy"
                value={profile.sellingPhilosophy}
                onChange={(v) => updateField("sellingPhilosophy", v)}
                placeholder="Your approach in one sentence"
                rows={2}
              />
              <TextInput
                label="Seller Archetype"
                value={profile.sellerArchetype}
                onChange={(v) => updateField("sellerArchetype", v)}
                placeholder="e.g., Challenger, Relationship Builder, Consultant"
              />
              <TextInput
                label="Key Strengths"
                value={(profile.keyStrengths || []).join(", ")}
                onChange={(v) => updateField("keyStrengths", v.split(",").map((s: string) => s.trim()).filter(Boolean))}
                placeholder="discovery, multithreading, executive presence"
                hint="Comma-separated"
              />
              <TextInput
                label="Target Role Types"
                value={(profile.targetRoleTypes || []).join(", ")}
                onChange={(v) => updateField("targetRoleTypes", v.split(",").map((s: string) => s.trim()).filter(Boolean))}
                placeholder="Enterprise AE, Strategic AE, Team Lead"
                hint="Comma-separated. Used for interview tools."
              />
              <TextArea
                label="Territory Focus"
                value={profile.territoryFocus}
                onChange={(v) => updateField("territoryFocus", v)}
                placeholder="Geographic, vertical, or segment focus"
                rows={2}
              />
              <TextArea
                label="Quota & Pipeline Context"
                value={profile.currentQuotaContext}
                onChange={(v) => updateField("currentQuotaContext", v)}
                placeholder="Where you are vs. quota, pipeline health, etc."
                rows={2}
              />
            </div>
          </CollapsibleSection>

          {/* SECTION 5: ICP Definitions */}
          <CollapsibleSection
            title="Ideal Customer Profiles"
            icon={Users}
            description="Who are your best-fit buyers?"
          >
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                Define your ideal customer profiles. These are used in prospect prep, outreach, and practice mode to generate realistic buyer personas.
              </p>
              {(profile.icpDefinitions || []).map((icp: ICPDefinition, i: number) => (
                <div key={i} className="rounded-lg border border-[#262626] bg-[#0a0a0a]/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-200">ICP #{i + 1}</span>
                    <button
                      onClick={() => {
                        const updated = [...(profile.icpDefinitions || [])];
                        updated.splice(i, 1);
                        updateField("icpDefinitions", updated);
                      }}
                      className="text-neutral-500 hover:text-red-500 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <TextInput
                    label="Industry / Vertical"
                    value={icp.industry}
                    onChange={(v) => {
                      const updated = [...(profile.icpDefinitions || [])];
                      updated[i] = { ...updated[i], industry: v };
                      updateField("icpDefinitions", updated);
                    }}
                    placeholder="e.g., Retail, Financial Services, Healthcare"
                  />
                  <TextInput
                    label="Company Size"
                    value={icp.companySize}
                    onChange={(v) => {
                      const updated = [...(profile.icpDefinitions || [])];
                      updated[i] = { ...updated[i], companySize: v };
                      updateField("icpDefinitions", updated);
                    }}
                    placeholder="e.g., Mid-market ($50M-$500M), Enterprise ($1B+)"
                  />
                  <TextInput
                    label="Buyer Persona / Title"
                    value={icp.buyerPersona}
                    onChange={(v) => {
                      const updated = [...(profile.icpDefinitions || [])];
                      updated[i] = { ...updated[i], buyerPersona: v };
                      updateField("icpDefinitions", updated);
                    }}
                    placeholder="e.g., VP Sales, CRO, Head of Revenue Operations"
                  />
                  <TextArea
                    label="Common Pains"
                    value={icp.commonPains}
                    onChange={(v) => {
                      const updated = [...(profile.icpDefinitions || [])];
                      updated[i] = { ...updated[i], commonPains: v };
                      updateField("icpDefinitions", updated);
                    }}
                    placeholder="What problems do they face that your product solves?"
                    rows={2}
                  />
                </div>
              ))}
              <button
                onClick={() => updateField("icpDefinitions", [...(profile.icpDefinitions || []), { ...EMPTY_ICP }])}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-400 transition"
              >
                <Plus className="h-4 w-4" /> Add ICP
              </button>
            </div>
          </CollapsibleSection>

          {/* SECTION 6: Case Studies */}
          <CollapsibleSection
            title="Case Studies"
            icon={FileText}
            description="Customer wins that power your outreach and interviews"
          >
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                Add your strongest customer stories. These get woven into outreach sequences, interview talk tracks, and practice mode scenarios.
              </p>
              {(profile.caseStudies || []).map((cs: CaseStudy, i: number) => (
                <div key={i} className="rounded-lg border border-[#262626] bg-[#0a0a0a]/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-200">Case Study #{i + 1}</span>
                    <button
                      onClick={() => {
                        const updated = [...(profile.caseStudies || [])];
                        updated.splice(i, 1);
                        updateField("caseStudies", updated);
                      }}
                      className="text-neutral-500 hover:text-red-500 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput
                      label="Customer Name"
                      value={cs.customerName}
                      onChange={(v) => {
                        const updated = [...(profile.caseStudies || [])];
                        updated[i] = { ...updated[i], customerName: v };
                        updateField("caseStudies", updated);
                      }}
                      placeholder="e.g., Vuori"
                    />
                    <TextInput
                      label="Industry"
                      value={cs.industry}
                      onChange={(v) => {
                        const updated = [...(profile.caseStudies || [])];
                        updated[i] = { ...updated[i], industry: v };
                        updateField("caseStudies", updated);
                      }}
                      placeholder="e.g., Retail, DTC"
                    />
                  </div>
                  <TextArea
                    label="Challenge"
                    value={cs.challenge}
                    onChange={(v) => {
                      const updated = [...(profile.caseStudies || [])];
                      updated[i] = { ...updated[i], challenge: v };
                      updateField("caseStudies", updated);
                    }}
                    placeholder="What problem did they face?"
                    rows={2}
                  />
                  <TextArea
                    label="Solution"
                    value={cs.solution}
                    onChange={(v) => {
                      const updated = [...(profile.caseStudies || [])];
                      updated[i] = { ...updated[i], solution: v };
                      updateField("caseStudies", updated);
                    }}
                    placeholder="How did your product solve it?"
                    rows={2}
                  />
                  <TextArea
                    label="Result"
                    value={cs.result}
                    onChange={(v) => {
                      const updated = [...(profile.caseStudies || [])];
                      updated[i] = { ...updated[i], result: v };
                      updateField("caseStudies", updated);
                    }}
                    placeholder="Measurable outcomes. Revenue impact, efficiency gains, time saved."
                    rows={2}
                  />
                  <TextInput
                    label="Customer Quote (optional)"
                    value={cs.quote}
                    onChange={(v) => {
                      const updated = [...(profile.caseStudies || [])];
                      updated[i] = { ...updated[i], quote: v };
                      updateField("caseStudies", updated);
                    }}
                    placeholder="A direct quote from the customer, if you have one"
                  />
                </div>
              ))}
              <button
                onClick={() => updateField("caseStudies", [...(profile.caseStudies || []), { ...EMPTY_CASE_STUDY }])}
                className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-400 transition"
              >
                <Plus className="h-4 w-4" /> Add Case Study
              </button>
            </div>
          </CollapsibleSection>

          {/* SECTION 7: Writing Style */}
          <CollapsibleSection
            title="Writing Style"
            icon={Pen}
            description="Your voice, banned phrases, and patterns"
          >
            <div className="space-y-4">
              <TextArea
                label="Writing Style"
                value={profile.writingStyle}
                onChange={(v) => updateField("writingStyle", v)}
                placeholder="How would you describe your writing? Direct, conversational, data-heavy?"
                rows={2}
              />
              <TextInput
                label="Banned Phrases"
                value={(profile.bannedPhrases || []).join(", ")}
                onChange={(v) => updateField("bannedPhrases", v.split(",").map((s: string) => s.trim()).filter(Boolean))}
                placeholder="delve, robust, streamline, comprehensive"
                hint="Comma-separated. Words you never want in outreach or decks."
              />
              <TextInput
                label="Signature Patterns"
                value={(profile.signaturePatterns || []).join(", ")}
                onChange={(v) => updateField("signaturePatterns", v.split(",").map((s: string) => s.trim()).filter(Boolean))}
                placeholder="Phrases or patterns you like using"
                hint="Comma-separated"
              />
            </div>
          </CollapsibleSection>

          {/* SECTION 8: Data & Privacy */}
          <CollapsibleSection
            title="Data & Privacy"
            icon={Shield}
            description="Transcript retention and recording data"
          >
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Transcript Retention Period
                </label>
                <select
                  value={profile.transcriptRetentionDays}
                  onChange={(e) =>
                    updateField(
                      "transcriptRetentionDays",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] px-3 py-2.5 text-sm text-neutral-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days (default)</option>
                  <option value={180}>180 days</option>
                </select>
                <p className="mt-1.5 text-xs text-neutral-500">
                  Meeting transcripts are automatically deleted after this
                  period. Coaching scores, analysis summaries, and skill
                  assessments are kept as part of your professional development
                  record.
                </p>
              </div>

              <div className="rounded-lg border border-neutral-700/50 bg-neutral-800/30 p-4">
                <h4 className="text-sm font-medium text-neutral-300 mb-1">
                  Purge All Transcripts
                </h4>
                <p className="text-xs text-neutral-500 mb-3">
                  Permanently delete all meeting transcripts and raw audio
                  references. Coaching analysis, scores, and outcome assessments
                  will be preserved.
                </p>
                <button
                  onClick={purgeAllTranscripts}
                  disabled={purging}
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {purging ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {purging ? "Purging..." : "Purge All Transcripts"}
                </button>
                {purgeResult && (
                  <p className="mt-2 text-xs text-neutral-400">{purgeResult}</p>
                )}
              </div>

              {profile.recordingConsentAcknowledgedAt && (
                <p className="text-xs text-neutral-500">
                  Recording disclosure acknowledged{" "}
                  {new Date(
                    profile.recordingConsentAcknowledgedAt
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          </CollapsibleSection>
        </div>

        {/* Knowledge Base link */}
        <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-500/10/50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300">Want even better results?</p>
            <p className="text-xs text-emerald-400 mt-0.5">Add product docs, competitive intel, and deal stories to your Knowledge Base.</p>
          </div>
          <a
            href="/knowledge-base"
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-[#141414] px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/100/10 transition"
          >
            <BookOpen className="h-4 w-4" />
            Knowledge Base
          </a>
        </div>

        {/* Bottom save bar */}
        <div className="mt-8 flex items-center justify-between rounded-xl border bg-[#141414] p-4 shadow-sm shadow-black/20">
          <p className="text-sm text-neutral-400">
            {profile.onboardingCompleted
              ? "Profile saved. Changes take effect on your next run."
              : "Complete your profile to get the most out of Sales Blitz."}
          </p>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Profile"}
          </button>
        </div>
      </main>
    </div>
  );
}
