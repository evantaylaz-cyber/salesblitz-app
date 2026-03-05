"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
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
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Globe,
  Sparkles,
  LinkIcon,
} from "lucide-react";

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
  dealStories: DealStory[];
  valueProps: ValueProp[];
  preferredTone: string;
  onboardingCompleted: boolean;
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
  sellingStyle: "MEDDPICC",
  dealStories: [],
  valueProps: [],
  preferredTone: "professional",
  onboardingCompleted: false,
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
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
            <Icon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {completionPct !== undefined && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-20 rounded-full bg-gray-100">
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
              <span className="text-xs text-gray-400">{completionPct}%</span>
            </div>
          )}
          {open ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition resize-y"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL fetch states
  const [fetchingCompany, setFetchingCompany] = useState(false);
  const [fetchCompanyError, setFetchCompanyError] = useState<string | null>(null);
  const [fetchingStoryUrl, setFetchingStoryUrl] = useState<number | null>(null);

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

  const saveProfile = useCallback(async () => {
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
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }, [profile]);

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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </a>
            <span className="text-gray-300">/</span>
            <h1 className="text-lg font-bold text-gray-900">Your Profile</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/onboarding/ai-setup"
              className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              <Sparkles className="h-4 w-4" />
              Fill with AI
            </a>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
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
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Intro banner */}
        {!profile.onboardingCompleted && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <AlertCircle className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-indigo-900">
                Set up your profile for better results
              </p>
              <p className="mt-1 text-sm text-indigo-700">
                Drop your company website below and we&apos;ll auto-fill most of this.
                The more context you provide, the more personalized your deliverables.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* SECTION 1: Company Context */}
          <CollapsibleSection
            title="Your Company"
            icon={Building2}
            description="Paste your website — we'll extract the rest"
            defaultOpen={!profile.onboardingCompleted}
            completionPct={getCompanyCompletion()}
          >
            <div className="space-y-4">
              {/* Company URL with fetch button */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Website
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={profile.companyUrl}
                    onChange={(e) => updateField("companyUrl", e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  />
                  <button
                    onClick={fetchCompanyFromUrl}
                    disabled={!profile.companyUrl || fetchingCompany}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
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
                <p className="mt-1 text-xs text-gray-400">
                  We&apos;ll pull your company info automatically. Review and edit below.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInput
                  label="Company Name"
                  value={profile.companyName}
                  onChange={(v) => updateField("companyName", v)}
                  placeholder="Acme Corp"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Tone
                  </label>
                  <select
                    value={profile.preferredTone}
                    onChange={(e) => updateField("preferredTone", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
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
                placeholder="What does your company sell? Be specific."
                hint="e.g., 'Sentinel — an EDR platform for mid-market enterprises'"
              />
              <TextArea
                label="Company Description"
                value={profile.companyDescription}
                onChange={(v) => updateField("companyDescription", v)}
                placeholder="Elevator pitch — what problem do you solve and for whom?"
              />
              <TextArea
                label="Key Differentiators"
                value={profile.companyDifferentiators}
                onChange={(v) => updateField("companyDifferentiators", v)}
                placeholder="What makes you different? Why do customers choose you?"
              />
              <TextArea
                label="Main Competitors"
                value={profile.companyCompetitors}
                onChange={(v) => updateField("companyCompetitors", v)}
                placeholder="Top 3-5 competitors — we'll use these in competitive research"
                hint="e.g., 'CrowdStrike, SentinelOne, Microsoft Defender'"
              />
              <TextArea
                label="Target Market"
                value={profile.companyTargetMarket}
                onChange={(v) => updateField("companyTargetMarket", v)}
                placeholder="Who are your ideal customers? Size, industry, buyer persona."
                rows={2}
              />
            </div>
          </CollapsibleSection>

          {/* SECTION 2: Your LinkedIn */}
          <CollapsibleSection
            title="Your LinkedIn"
            icon={User}
            description="Your background — used to position you in deliverables"
            completionPct={getLinkedinCompletion()}
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Paste sections from your own LinkedIn profile. This helps us
                position you credibly in research briefs and POV decks.
              </p>
              <TextArea
                label="About / Summary"
                value={profile.linkedinAbout}
                onChange={(v) => updateField("linkedinAbout", v)}
                placeholder="Paste your LinkedIn About section"
                rows={4}
              />
              <TextArea
                label="Experience"
                value={profile.linkedinExperience}
                onChange={(v) => updateField("linkedinExperience", v)}
                placeholder="Paste your recent experience (last 2-3 roles)"
                rows={5}
                hint="Include company names, titles, key achievements"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Methodology
                </label>
                <select
                  value={profile.sellingStyle}
                  onChange={(e) => updateField("sellingStyle", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="MEDDPICC">MEDDPICC</option>
                  <option value="MEDDIC">MEDDIC</option>
                  <option value="Command of the Message">Command of the Message</option>
                  <option value="MEDDPICC + CotM">MEDDPICC + CotM</option>
                  <option value="Challenger Sale">Challenger Sale</option>
                  <option value="SPIN Selling">SPIN Selling</option>
                  <option value="Sandler">Sandler</option>
                  <option value="Solution Selling">Solution Selling</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Deal Stories */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Deal Stories
                    </h4>
                    <p className="text-xs text-gray-500">
                      Your best wins — paste a case study link or fill in manually
                    </p>
                  </div>
                  <button
                    onClick={addDealStory}
                    className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Story
                  </button>
                </div>

                {profile.dealStories.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      No deal stories yet. Add a link to a case study or type one in.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {profile.dealStories.map((story, i) => (
                    <div
                      key={i}
                      className="rounded-lg border bg-gray-50 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase">
                          Story {i + 1}
                        </span>
                        <button
                          onClick={() => removeDealStory(i)}
                          className="text-gray-400 hover:text-red-500 transition"
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
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <button
                          onClick={() => fetchDealStoryFromUrl(i)}
                          disabled={!story.sourceUrl || fetchingStoryUrl === i}
                          className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition whitespace-nowrap"
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
                          placeholder="Story name"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <input
                          type="text"
                          value={story.customer}
                          onChange={(e) =>
                            updateDealStory(i, "customer", e.target.value)
                          }
                          placeholder="Customer name"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <textarea
                        value={story.challenge}
                        onChange={(e) =>
                          updateDealStory(i, "challenge", e.target.value)
                        }
                        placeholder="What was the challenge?"
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                      />
                      <textarea
                        value={story.solution}
                        onChange={(e) =>
                          updateDealStory(i, "solution", e.target.value)
                        }
                        placeholder="What did you sell / how did you solve it?"
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                      />
                      <textarea
                        value={story.result}
                        onChange={(e) =>
                          updateDealStory(i, "result", e.target.value)
                        }
                        placeholder="What was the outcome?"
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                      />
                      <input
                        type="text"
                        value={story.metrics}
                        onChange={(e) =>
                          updateDealStory(i, "metrics", e.target.value)
                        }
                        placeholder="Key metrics (e.g., '$2.1M ACV, 340% ROI')"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Value Props */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Value Propositions
                    </h4>
                    <p className="text-xs text-gray-500">
                      Your core selling points — headline, detail, and proof
                    </p>
                  </div>
                  <button
                    onClick={addValueProp}
                    className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <Plus className="h-3 w-3" /> Add Prop
                  </button>
                </div>

                {profile.valueProps.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
                    <Target className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      No value props yet. What are the top reasons customers
                      buy from you?
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {profile.valueProps.map((prop, i) => (
                    <div
                      key={i}
                      className="rounded-lg border bg-gray-50 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase">
                          Value Prop {i + 1}
                        </span>
                        <button
                          onClick={() => removeValueProp(i)}
                          className="text-gray-400 hover:text-red-500 transition"
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <textarea
                        value={prop.description}
                        onChange={(e) =>
                          updateValueProp(i, "description", e.target.value)
                        }
                        placeholder="Why this matters to the buyer"
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                      />
                      <input
                        type="text"
                        value={prop.proofPoint}
                        onChange={(e) =>
                          updateValueProp(i, "proofPoint", e.target.value)
                        }
                        placeholder="Proof point (customer quote, stat, case study reference)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Knowledge Base link */}
        <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-900">Want even better results?</p>
            <p className="text-xs text-indigo-700 mt-0.5">Add product docs, competitive intel, and deal stories to your Knowledge Base.</p>
          </div>
          <a
            href="/knowledge-base"
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition"
          >
            <BookOpen className="h-4 w-4" />
            Knowledge Base
          </a>
        </div>

        {/* Bottom save bar */}
        <div className="mt-8 flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            {profile.onboardingCompleted
              ? "Profile saved. Changes take effect on your next run."
              : "Complete your profile to get the most out of AltVest."}
          </p>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
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
