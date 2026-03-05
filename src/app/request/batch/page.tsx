"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  Zap,
} from "lucide-react";

interface AccountInput {
  id: string;
  targetName: string;
  targetCompany: string;
  targetRole: string;
  linkedinUrl: string;
  targetCompanyUrl: string;
}

interface SharedContext {
  engagementType: "cold_outreach" | "warm_intro" | "existing_relationship";
  additionalNotes: string;
}

const TOOL_OPTIONS = [
  { value: "prospect_prep", label: "Prospect Prep" },
  { value: "interview_prep", label: "Interview Prep" },
];

const BATCH_TYPE_OPTIONS = [
  { value: "territory_mapping", label: "Territory Mapping" },
  { value: "multi_threading", label: "Multi-Threading" },
  { value: "competitive_sweep", label: "Competitive Sweep" },
];

const ENGAGEMENT_TYPE_OPTIONS = [
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "warm_intro", label: "Warm Introduction" },
  { value: "existing_relationship", label: "Existing Relationship" },
];

const RUNS_PER_ACCOUNT = 1;

export default function BatchRequestPage() {
  const { isLoaded, user } = useUser();
  const router = useRouter();

  const [toolName, setToolName] = useState<"prospect_prep" | "interview_prep">("prospect_prep");
  const [batchType, setBatchType] = useState<"territory_mapping" | "multi_threading" | "competitive_sweep">("territory_mapping");
  const [accounts, setAccounts] = useState<AccountInput[]>([
    { id: "1", targetName: "", targetCompany: "", targetRole: "", linkedinUrl: "", targetCompanyUrl: "" },
    { id: "2", targetName: "", targetCompany: "", targetRole: "", linkedinUrl: "", targetCompanyUrl: "" },
  ]);
  const [sharedContext, setSharedContext] = useState<SharedContext>({
    engagementType: "cold_outreach",
    additionalNotes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6366f1" }} />
      </div>
    );
  }

  const addAccount = () => {
    if (accounts.length < 10) {
      const newId = String(Math.max(...accounts.map((a) => parseInt(a.id))) + 1);
      setAccounts([
        ...accounts,
        { id: newId, targetName: "", targetCompany: "", targetRole: "", linkedinUrl: "", targetCompanyUrl: "" },
      ]);
    }
  };

  const removeAccount = (id: string) => {
    if (accounts.length > 2) {
      setAccounts(accounts.filter((a) => a.id !== id));
    }
  };

  const updateAccount = (id: string, field: keyof AccountInput, value: string) => {
    setAccounts(accounts.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const updateSharedContext = (field: keyof SharedContext, value: string) => {
    setSharedContext({ ...sharedContext, [field]: value });
  };

  const isValid =
    accounts.every((a) => a.targetName.trim() && a.targetCompany.trim()) &&
    toolName &&
    batchType;

  const runsCost = accounts.length * RUNS_PER_ACCOUNT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        toolName,
        batchType,
        accounts: accounts.map((a) => ({
          targetName: a.targetName.trim(),
          targetCompany: a.targetCompany.trim(),
          ...(a.targetRole.trim() && { targetRole: a.targetRole.trim() }),
          ...(a.linkedinUrl.trim() && { linkedinUrl: a.linkedinUrl.trim() }),
          ...(a.targetCompanyUrl.trim() && { targetCompanyUrl: a.targetCompanyUrl.trim() }),
        })),
        sharedContext: {
          engagementType: sharedContext.engagementType,
          ...(sharedContext.additionalNotes.trim() && { additionalNotes: sharedContext.additionalNotes.trim() }),
        },
      };

      const res = await fetch("/api/batch-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create batch request");
      }

      const data = await res.json();
      router.push(`/batch/${data.batchJobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a
              href="/requests"
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <h1 className="text-lg font-bold text-white">Batch Request</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tool Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-white">
              Tool <span className="text-red-500">*</span>
            </label>
            <select
              value={toolName}
              onChange={(e) => setToolName(e.target.value as typeof toolName)}
              className="w-full rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            >
              {TOOL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-white">
              Batch Type <span className="text-red-500">*</span>
            </label>
            <select
              value={batchType}
              onChange={(e) => setBatchType(e.target.value as typeof batchType)}
              className="w-full rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            >
              {BATCH_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Accounts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-white">
                Accounts <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-zinc-400">
                {accounts.length} / 10
              </span>
            </div>

            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">
                        Target Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={account.targetName}
                        onChange={(e) => updateAccount(account.id, "targetName", e.target.value)}
                        placeholder="e.g., John Smith"
                        className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">
                        Target Company <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={account.targetCompany}
                        onChange={(e) => updateAccount(account.id, "targetCompany", e.target.value)}
                        placeholder="e.g., Acme Corp"
                        className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                      Target Role
                    </label>
                    <input
                      type="text"
                      value={account.targetRole}
                      onChange={(e) => updateAccount(account.id, "targetRole", e.target.value)}
                      placeholder="e.g., VP Sales"
                      className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">
                        LinkedIn URL
                      </label>
                      <input
                        type="url"
                        value={account.linkedinUrl}
                        onChange={(e) => updateAccount(account.id, "linkedinUrl", e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">
                        Company URL
                      </label>
                      <input
                        type="url"
                        value={account.targetCompanyUrl}
                        onChange={(e) => updateAccount(account.id, "targetCompanyUrl", e.target.value)}
                        placeholder="https://acmecorp.com"
                        className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {accounts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeAccount(account.id)}
                      className="mt-2 flex items-center gap-2 text-xs text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {accounts.length < 10 && (
              <button
                type="button"
                onClick={addAccount}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-800/60 py-3 text-sm font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition"
              >
                <Plus className="h-4 w-4" />
                Add Account
              </button>
            )}
          </div>

          {/* Shared Context Section */}
          <div className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5">
            <h3 className="text-sm font-semibold text-white">Shared Context</h3>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Engagement Type <span className="text-red-500">*</span>
              </label>
              <select
                value={sharedContext.engagementType}
                onChange={(e) =>
                  updateSharedContext("engagementType", e.target.value as any)
                }
                className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              >
                {ENGAGEMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Additional Notes
              </label>
              <textarea
                value={sharedContext.additionalNotes}
                onChange={(e) => updateSharedContext("additionalNotes", e.target.value)}
                placeholder="Any additional context for the batch (optional)"
                rows={4}
                className="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition resize-none"
              />
            </div>
          </div>

          {/* Run Cost Display */}
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/30 p-4">
            <div className="flex items-center gap-2 text-sm text-indigo-300">
              <Zap className="h-4 w-4" />
              This will use <span className="font-semibold">{runsCost}</span> run
              {runsCost !== 1 ? "s" : ""} from your balance
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-950/30 p-4">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/requests")}
              className="flex-1 rounded-lg border border-zinc-800/60 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-900/50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Batch Request"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
