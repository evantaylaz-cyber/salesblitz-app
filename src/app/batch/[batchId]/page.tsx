"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Map,
  Zap,
} from "lucide-react";

interface AccountStatus {
  id: string;
  targetName: string;
  targetCompany: string;
  status: "submitted" | "researching" | "ready" | "delivered" | "failed";
  currentStep?: string;
  childRequestId: string;
}

interface StepProgress {
  name: string;
  label: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

interface BatchJobData {
  id: string;
  toolName: string;
  batchType: string;
  status: "processing" | "completed" | "failed" | "partial";
  totalAccounts: number;
  completedAccounts: number;
  failedAccounts: number;
  percentComplete: number;
  steps: StepProgress[];
  accountStatuses: AccountStatus[];
  createdAt: string;
  updatedAt: string;
  synthesisHighlights?: {
    topPriorityAccount?: string;
    territoryStrategySummary?: string;
  };
  batchAssets?: {
    scorecardUrl?: string;
    landscapeUrl?: string;
    strategyBriefUrl?: string;
  };
}

const STATUS_ICON: Record<string, React.ElementType> = {
  submitted: Clock,
  researching: Loader2,
  ready: CheckCircle2,
  delivered: CheckCircle2,
  failed: AlertCircle,
};

const STATUS_COLOR: Record<string, { text: string; bg: string }> = {
  submitted: { text: "text-blue-400", bg: "bg-blue-950/40 border-blue-500/20" },
  researching: { text: "text-amber-400", bg: "bg-amber-950/40 border-amber-500/20" },
  ready: { text: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-500/20" },
  delivered: { text: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-500/20" },
  failed: { text: "text-red-400", bg: "bg-red-950/40 border-red-500/20" },
};

const STEP_ORDER = ["per_account_research", "comparative_synthesis", "batch_assets", "delivery"];

export default function BatchProgressPage() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const params = useParams();
  const batchId = params.batchId as string;

  const [batchJob, setBatchJob] = useState<BatchJobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (!batchId || !user) return;

    const fetchBatch = async () => {
      try {
        const res = await fetch(`/api/batch-requests/${batchId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch batch");
        }
        const data = await res.json();
        setBatchJob(data.batchJob);
        setError(null);

        if (data.batchJob.status === "completed" || data.batchJob.status === "failed" || data.batchJob.status === "partial") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
    pollIntervalRef.current = setInterval(fetchBatch, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [batchId, user]);

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6366f1" }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6366f1" }} />
      </div>
    );
  }

  if (error || !batchJob) {
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
              <h1 className="text-lg font-bold text-white">Batch Progress</h1>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-950/30 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error || "Batch not found"}</p>
          </div>
        </main>
      </div>
    );
  }

  const isComplete = ["completed", "failed", "partial"].includes(batchJob.status);
  const isProcessing = !isComplete;

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
            <h1 className="text-lg font-bold text-white">Batch Progress</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* Overall Batch Status */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Batch Status</h2>
              <p className="text-sm text-zinc-400 mt-1">
                {batchJob.totalAccounts} account{batchJob.totalAccounts !== 1 ? "s" : ""} in batch
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                batchJob.status === "completed"
                  ? "text-emerald-400 bg-emerald-950/40 border-emerald-500/20"
                  : batchJob.status === "failed"
                  ? "text-red-400 bg-red-950/40 border-red-500/20"
                  : "text-amber-400 bg-amber-950/40 border-amber-500/20"
              }`}
            >
              {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
              {batchJob.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
              {batchJob.status === "failed" && <AlertCircle className="h-3 w-3" />}
              {batchJob.status === "partial" && <Clock className="h-3 w-3" />}
              {batchJob.status.charAt(0).toUpperCase() + batchJob.status.slice(1)}
            </span>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Overall Progress</span>
              <span className="text-sm font-semibold text-white">{batchJob.percentComplete}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  batchJob.status === "failed"
                    ? "bg-red-500"
                    : batchJob.percentComplete === 100
                    ? "bg-emerald-500"
                    : "bg-indigo-500"
                }`}
                style={{ width: `${batchJob.percentComplete}%` }}
              />
            </div>
          </div>

          {/* Account Stats */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="rounded-lg bg-zinc-800/30 p-3">
              <p className="text-xs text-zinc-400 mb-1">Completed</p>
              <p className="text-lg font-semibold text-emerald-400">{batchJob.completedAccounts}</p>
            </div>
            <div className="rounded-lg bg-zinc-800/30 p-3">
              <p className="text-xs text-zinc-400 mb-1">In Progress</p>
              <p className="text-lg font-semibold text-amber-400">
                {batchJob.totalAccounts - batchJob.completedAccounts - batchJob.failedAccounts}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-800/30 p-3">
              <p className="text-xs text-zinc-400 mb-1">Failed</p>
              <p className="text-lg font-semibold text-red-400">{batchJob.failedAccounts}</p>
            </div>
          </div>
        </div>

        {/* Step Progress */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Processing Steps</h3>
          <div className="space-y-3">
            {batchJob.steps &&
              batchJob.steps
                .sort((a, b) => STEP_ORDER.indexOf(a.name) - STEP_ORDER.indexOf(b.name))
                .map((step, idx) => (
                  <div key={step.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-zinc-300">{step.label}</span>
                      <span
                        className={`text-xs font-medium ${
                          step.status === "completed"
                            ? "text-emerald-400"
                            : step.status === "in_progress"
                            ? "text-amber-400"
                            : step.status === "failed"
                            ? "text-red-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {step.status.charAt(0).toUpperCase() +
                          step.status.slice(1).replace("_", " ")}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          step.status === "completed"
                            ? "bg-emerald-500 w-full"
                            : step.status === "in_progress"
                            ? "bg-indigo-500 w-1/2"
                            : step.status === "failed"
                            ? "bg-red-500 w-full"
                            : "bg-zinc-700/50 w-0"
                        }`}
                      />
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Per-Account Status */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Account Progress</h3>
          <div className="space-y-3">
            {batchJob.accountStatuses && batchJob.accountStatuses.length > 0 ? (
              batchJob.accountStatuses.map((account) => {
                const StatusIcon = STATUS_ICON[account.status] || Clock;
                const statusColor = STATUS_COLOR[account.status];

                return (
                  <button
                    key={account.id}
                    onClick={() => router.push(`/requests/${account.childRequestId}`)}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition hover:border-indigo-500/50 ${statusColor.bg}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon
                            className={`h-4 w-4 ${statusColor.text} ${
                              ["researching", "submitted"].includes(account.status)
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                          <span className="font-medium text-white">
                            {account.targetName}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">
                          {account.targetCompany}
                        </p>
                        {account.currentStep && (
                          <p className="text-xs text-zinc-500 mt-1.5">
                            {account.currentStep}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${statusColor.text} whitespace-nowrap ml-4`}>
                        {account.status.charAt(0).toUpperCase() +
                          account.status.slice(1).replace("_", " ")}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-zinc-400">No accounts yet</p>
            )}
          </div>
        </div>

        {/* Synthesis Highlights (when complete) */}
        {isComplete && batchJob.synthesisHighlights && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-emerald-300">Synthesis Highlights</h3>
            </div>

            {batchJob.synthesisHighlights.topPriorityAccount && (
              <div>
                <p className="text-xs text-emerald-400/70 uppercase tracking-wide mb-1">
                  Top Priority Account
                </p>
                <p className="text-white">
                  {batchJob.synthesisHighlights.topPriorityAccount}
                </p>
              </div>
            )}

            {batchJob.synthesisHighlights.territoryStrategySummary && (
              <div>
                <p className="text-xs text-emerald-400/70 uppercase tracking-wide mb-1">
                  Territory Strategy
                </p>
                <p className="text-white text-sm leading-relaxed">
                  {batchJob.synthesisHighlights.territoryStrategySummary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Batch Assets (when complete) */}
        {isComplete && batchJob.batchAssets && (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Batch Assets</h3>
            <div className="space-y-2">
              {batchJob.batchAssets.scorecardUrl && (
                <a
                  href={batchJob.batchAssets.scorecardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-800/20 px-4 py-3 hover:bg-zinc-800/40 transition"
                >
                  <FileText className="h-5 w-5 text-indigo-400" />
                  <span className="flex-1 text-sm font-medium text-white">Batch Scorecard</span>
                  <span className="text-zinc-500">↗</span>
                </a>
              )}

              {batchJob.batchAssets.landscapeUrl && (
                <a
                  href={batchJob.batchAssets.landscapeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-800/20 px-4 py-3 hover:bg-zinc-800/40 transition"
                >
                  <Map className="h-5 w-5 text-indigo-400" />
                  <span className="flex-1 text-sm font-medium text-white">Competitive Landscape</span>
                  <span className="text-zinc-500">↗</span>
                </a>
              )}

              {batchJob.batchAssets.strategyBriefUrl && (
                <a
                  href={batchJob.batchAssets.strategyBriefUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-800/20 px-4 py-3 hover:bg-zinc-800/40 transition"
                >
                  <Zap className="h-5 w-5 text-indigo-400" />
                  <span className="flex-1 text-sm font-medium text-white">Strategy Brief</span>
                  <span className="text-zinc-500">↗</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Status Message */}
        {isComplete && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-950/30 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">
              Batch processing{" "}
              {batchJob.status === "completed"
                ? "completed successfully"
                : batchJob.status === "failed"
                ? "failed"
                : "partially completed"}
              . You can now view individual requests.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
