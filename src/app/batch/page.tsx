"use client";

import { useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Globe,
  Users,
  FileText,
  Zap,
  MapPin,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import VoiceTextarea from "@/components/VoiceTextarea";

interface Account {
  targetCompany: string;
  targetName: string;
  targetRole?: string;
  targetCompanyUrl?: string;
  linkedinUrl?: string;
}

const EMPTY_ACCOUNT: Account = {
  targetCompany: "",
  targetName: "",
  targetRole: "",
  targetCompanyUrl: "",
  linkedinUrl: "",
};

// Parse CSV/TSV text into accounts
function parseAccountsFromText(text: string): Account[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];

  const accounts: Account[] = [];
  for (const line of lines) {
    // Try tab first, then comma
    const sep = line.includes("\t") ? "\t" : ",";
    const parts = line.split(sep).map(s => s.trim().replace(/^["']|["']$/g, ""));
    if (parts.length >= 2) {
      accounts.push({
        targetCompany: parts[0],
        targetName: parts[1],
        targetRole: parts[2] || "",
        targetCompanyUrl: parts[3] || "",
        linkedinUrl: parts[4] || "",
      });
    } else if (parts.length === 1 && parts[0]) {
      // Just a company name
      accounts.push({
        targetCompany: parts[0],
        targetName: "",
        targetRole: "",
        targetCompanyUrl: "",
        linkedinUrl: "",
      });
    }
  }
  return accounts;
}

export default function BatchPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accounts, setAccounts] = useState<Account[]>([
    { ...EMPTY_ACCOUNT },
    { ...EMPTY_ACCOUNT },
  ]);
  const [toolName, setToolName] = useState("prospect_outreach");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedBatchId, setSubmittedBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  function updateAccount(idx: number, field: keyof Account, value: string) {
    const updated = [...accounts];
    updated[idx] = { ...updated[idx], [field]: value };
    setAccounts(updated);
  }

  function addAccount() {
    if (accounts.length >= 10) return;
    setAccounts([...accounts, { ...EMPTY_ACCOUNT }]);
  }

  function removeAccount(idx: number) {
    if (accounts.length <= 2) return;
    setAccounts(accounts.filter((_, i) => i !== idx));
  }

  function handlePasteImport() {
    const parsed = parseAccountsFromText(pasteText);
    if (parsed.length === 0) {
      setError("Could not parse any accounts. Use: Company, Contact Name (one per line)");
      return;
    }
    if (parsed.length > 10) {
      setError("Maximum 10 accounts per batch. Your list has " + parsed.length + ".");
      return;
    }
    setAccounts(parsed.length >= 2 ? parsed : [...parsed, { ...EMPTY_ACCOUNT }]);
    setPasteMode(false);
    setPasteText("");
    setError(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseAccountsFromText(text);
      if (parsed.length === 0) {
        setError("Could not parse accounts from file. Expected: Company, Contact Name");
        return;
      }
      if (parsed.length > 10) {
        setError("Maximum 10 accounts per batch. File has " + parsed.length + ".");
        return;
      }
      setAccounts(parsed.length >= 2 ? parsed : [...parsed, { ...EMPTY_ACCOUNT }]);
      setError(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validate at least 2 accounts with company names
    const validAccounts = accounts.filter(a => a.targetCompany.trim());
    if (validAccounts.length < 2) {
      setError("Add at least 2 target accounts to run a Territory Blitz.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/batch-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName,
          batchType: "territory_mapping",
          accounts: validAccounts.map(a => ({
            targetCompany: a.targetCompany.trim(),
            targetName: a.targetName?.trim() || a.targetCompany.trim(),
            targetRole: a.targetRole || undefined,
            targetCompanyUrl: a.targetCompanyUrl || undefined,
            linkedinUrl: a.linkedinUrl || undefined,
          })),
          sharedContext: {
            additionalNotes: additionalNotes || undefined,
            engagementType: "cold_outreach",
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setSubmittedBatchId(data.batchJobId);
      } else {
        setError(data.error || "Failed to submit batch request");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (submitted) {
    const validCount = accounts.filter(a => a.targetCompany.trim()).length;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Territory Blitz Started</h1>
          <p className="mt-3 text-neutral-300">
            Researching <strong>{validCount} accounts</strong> in parallel. Each account gets a context file, POV deck, speaker notes, and outreach sequence.
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            You will also receive a comparative territory scorecard once all accounts are complete.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <a
              href="/dashboard"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const validCount = accounts.filter(a => a.targetCompany.trim()).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav />
      <header className="border-b border-[#262626] bg-[#141414]">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-[#1a1a1a] hover:text-neutral-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-400" />
              Territory Blitz
            </h1>
            <p className="text-sm text-neutral-400">Upload your target list. Get research, outreach & competitive intel for every account.</p>
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

          {/* Import Options */}
          <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 shadow-sm shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-neutral-500" />
                Target Accounts ({validCount}/10)
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPasteMode(!pasteMode)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-[#262626] transition"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Paste List
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-[#262626] transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload CSV
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Paste mode */}
            {pasteMode && (
              <div className="mb-4 space-y-3">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={6}
                  placeholder={"Acme Corp, John Smith, VP Sales\nGlobex Inc, Jane Doe, Director of Ops\nSoylent Corp, Bob Jones"}
                  className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none font-mono"
                />
                <p className="text-xs text-neutral-500">One account per line. Format: Company, Contact Name, Title (optional), Company URL (optional), LinkedIn URL (optional)</p>
                <button
                  type="button"
                  onClick={handlePasteImport}
                  disabled={!pasteText.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Import {parseAccountsFromText(pasteText).length} account{parseAccountsFromText(pasteText).length !== 1 ? "s" : ""}
                </button>
              </div>
            )}

            {/* Account cards */}
            <div className="space-y-3">
              {accounts.map((acct, idx) => (
                <div key={idx} className="rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-neutral-500">Account {idx + 1}</span>
                    {accounts.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAccount(idx)}
                        className="text-neutral-600 hover:text-red-400 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-400">
                        <Globe className="h-3 w-3" /> Company *
                      </label>
                      <input
                        type="text"
                        value={acct.targetCompany}
                        onChange={(e) => updateAccount(idx, "targetCompany", e.target.value)}
                        placeholder="Acme Corp"
                        className="w-full rounded-lg border border-[#262626] bg-[#141414] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-400">
                        <Users className="h-3 w-3" /> Contact Name
                      </label>
                      <input
                        type="text"
                        value={acct.targetName}
                        onChange={(e) => updateAccount(idx, "targetName", e.target.value)}
                        placeholder="John Smith"
                        className="w-full rounded-lg border border-[#262626] bg-[#141414] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 text-xs font-medium text-neutral-400">Title</label>
                      <input
                        type="text"
                        value={acct.targetRole || ""}
                        onChange={(e) => updateAccount(idx, "targetRole", e.target.value)}
                        placeholder="VP Sales"
                        className="w-full rounded-lg border border-[#262626] bg-[#141414] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 text-xs font-medium text-neutral-400">Company URL</label>
                      <input
                        type="text"
                        value={acct.targetCompanyUrl || ""}
                        onChange={(e) => updateAccount(idx, "targetCompanyUrl", e.target.value)}
                        placeholder="https://acme.com"
                        className="w-full rounded-lg border border-[#262626] bg-[#141414] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {accounts.length < 10 && (
              <button
                type="button"
                onClick={addAccount}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#333] py-2.5 text-xs font-medium text-neutral-400 hover:border-emerald-500/40 hover:text-emerald-400 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Account
              </button>
            )}
          </div>

          {/* Blitz Type */}
          <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 shadow-sm shadow-black/20">
            <h2 className="text-base font-semibold text-white mb-3">What do you need for each account?</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { id: "prospect_outreach", label: "Outreach Package", desc: "Context file, POV deck, outreach sequence" },
                { id: "prospect_prep", label: "Full Prep Package", desc: "Context file, POV deck, speaker notes, outreach sequence" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setToolName(opt.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    toolName === opt.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-[#262626] hover:border-[#333] bg-[#0a0a0a]"
                  }`}
                >
                  <p className={`text-sm font-medium ${toolName === opt.id ? "text-emerald-400" : "text-white"}`}>
                    {opt.label}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Shared Context */}
          <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 shadow-sm shadow-black/20">
            <h2 className="text-base font-semibold text-white mb-1">Shared Context (optional)</h2>
            <p className="text-sm text-neutral-400 mb-3">
              Notes that apply to all accounts in this batch. Your territory focus, ICP details, common pain points, etc.
            </p>
            <VoiceTextarea
              value={additionalNotes}
              onChange={setAdditionalNotes}
              rows={3}
              placeholder={"e.g., Focus on companies with 500+ employees in financial services. Our main differentiator is SOC 2 compliance and 3x faster onboarding vs. competitors."}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              {validCount} account{validCount !== 1 ? "s" : ""} will consume {validCount} blitz run{validCount !== 1 ? "s" : ""}
            </p>
            <button
              type="submit"
              disabled={submitting || validCount < 2}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {submitting ? "Launching..." : `Launch Territory Blitz (${validCount} runs)`}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
