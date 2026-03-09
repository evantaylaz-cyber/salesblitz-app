"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Map,
  Zap,
  MessageCircle,
} from "lucide-react";
import AppNav from "@/components/AppNav";

interface AccountStatus {
  requestId: string;
  targetName: string;
  targetCompany: string;
  status: string;
  percentComplete: number;
  currentStep?: string;
}

interface StepProgress {
  id?: string;
  name?: string;
  label: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

interface BatchJobData {
  id: string;
  toolName: string;
  batchType: string;
  status: "processing" | "completed" | "delivered" | "failed" | "partial" | "awaiting_clarification";
  totalAccounts: number;
  completedAccounts: number;
  failedAccounts: number;
  awaitingAccounts?: number;
  percentComplete: number;
  steps: StepProgress[];
  accountStatuses: AccountStatus[];
  createdAt: string;
  updatedAt: string;
  synthesisHighlights?: any;
  batchAssetUrls?: any[];
}

const STATUS_ICON: Record<string, React.ElementType> = {
  submitted: Clock,
  researching: Loader2,
  processing: Loader2,
  awaiting_clarification: MessageCircle,
  ready: CheckCircle2,
  delivered: CheckCircle2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

const STATUS_COLOR: Record<string, { text: string; bg: string }> = {
  submitted: { text: "text-blue-400", bg: "bg-blue-950/40 border-blue-500/20" },
  researching: { text: "text-amber-400", bg: "bg-amber-950/40 border-amber-500/20" },
  processing: { text: "text-amber-400", bg: "bg-amber-950/40 border-amber-500/20" },
  awaiting_clarification: { text: "text-yellow-400", bg: "bg-yellow-950/40 border-yellow-500/20" },
  ready: { text: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-500/20" },
  delivered: { text: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-500/20" },
  completed: { text: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-500/20" },
  failed: { text: "text-red-400", bg: "bg-red-950/40 border-red-500/20" },
};

const STEP_ORDER = ["per_account_research", "comparative_synthesis", "asset_generation", "batch_assets", "delivery"];

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
    if (!user) { router.push("/sign-in"); }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (!batchId || !user) return;
    const fetchBatch = async () => {
      try {
        const res = await fetch(`/api/batch-requests/${batchId}`);
        if (!res.ok) { throw new Error("Failed to fetch batch"); }
        const data = await res.json();
        setBatchJob(data.batchJob);
        setError(null);
        if (
          data.batchJob.status === "completed" ||
          data.batchJob.status === "delivered" ||
          data.batchJob.status === "failed" ||
          data.batchJob.status === "partial"
        ) {
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
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); }
    };
  }, [batchId, user]);

  if (!isLoaded || !user) {
    return (<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6366f1" }} /></div>);
  }
  if (loading) {
    return (<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6366f1" }} /></div>);
  }

  if (error || !batchJob) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <AppNav currentPage="/requests" />
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-950/30 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error || "Batch not found"}</p>
          </div>
        </main>
      </div>
    );
  }

  const isComplete = ["completed", "delivered", "failed", "partial"].includes(batchJob.status);
  const isAwaiting = batchJob.status === "awaiting_clarification";
  const isProcessing = !isComplete && !isAwaiting;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AppNav currentPage="/requests" />

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* Overall Batch Status */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Batch Status</h2>
              <p className="text-sm text-zinc-400 mt-1">{batchJob.totalAccounts} account{batchJob.totalAccounts !== 1 ? "s" : ""} in batch</p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              batchJob.status === "completed" || batchJob.status === "delivered"
                ? "text-emerald-400 bg-emerald-950/40 border-emerald-500/20"
                : batchJob.status === "failed"
                ? "text-red-400 bg-red-950/40 border-red-500/20"
                : batchJob.status === "awaiting_clarification"
                ? "text-yellow-400 bg-yellow-950/40 border-yellow-500/20"
                : "text-amber-400 bg-amber-950/40 border-amber-500/20"
            }`}>
              {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
              {(batchJob.status === "completed" || batchJob.status === "delivered") && <CheckCircle2 className="h-3 w-3" />}
              {batchJob.status === "failed" && <AlertCircle className="h-3 w-3" />}
              {batchJob.status === "partial" && <Clock className="h-3 w-3" />}
              {batchJob.status === "awaiting_clarification" && <MessageCircle className="h-3 w-3" />}
              {batchJob.status === "awaiting_clarification" ? "Awaiting Clarification" : batchJob.status.charAt(0).toUpperCase() + batchJob.status.slice(1)}
            </span>
          </div>

          {isAwaiting && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-950/30 p-4">
              <MessageCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-300">Clarification Needed</p>
                <p className="text-sm text-yellow-300/70 mt-1">We need more information to complete some accounts. Check your email for a clarification request.</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Overall Progress</span>
              <span className="text-sm font-semibold text-white">{batchJob.percentComplete}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800/60 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                batchJob.status === "failed" ? "bg-red-500"
                : batchJob.percentComplete === 100 ? "bg-emerald-500"
                : isAwaiting ? "bg-yellow-500"
                : "bg-emerald-500"
              }`} style={{ width: `${batchJob.percentComplete}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="rounded-lg bg-zinc-800/30 p-3">
              <p className="text-xs text-zinc-400 mb-1">Completed</p>
              <p className="text-lg font-semibold text-emerald-400">{batchJob.completedAccounts}</p>
            </div>
            <div className="rounded-lg bg-zinc-800/30 p-3">
              <p className="text-xs text-zinc-400 mb-1">{(batchJob.awaitingAccounts || 0) > 0 ? "Awaiting Input" : "In Progress"}</p>
              <p className={`text-lg font-semibold ${(batchJob.awaitingAccounts || 0) > 0 ? "text-yellow-400" : "text-amber-400"}`}>
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
            {batchJob.steps && batchJob.steps
              .sort((a, b) => STEP_ORDER.indexOf(a.name || a.id || "") - STEP_ORDER.indexOf(b.name || b.id || ""))
              .map((step, idx) => (
                <div key={step.name || step.id || idx}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-zinc-300">{step.label}</span>
                    <span className={`text-xs font-medium ${
                      step.status === "completed" ? "text-emerald-400"
                      : step.status === "in_progress" ? "text-amber-400"
                      : step.status === "failed" ? "text-red-400"
                      : "text-zinc-500"
                    }`}>{step.status.charAt(0).toUpperCase() + step.status.slice(1).replace("_", " ")}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800/60 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      step.status === "completed" ? "bg-emerald-500 w-full"
                      : step.status === "in_progress" ? "bg-emerald-500 w-1/2"
                      : step.status === "failed" ? "bg-red-500 w-full"
                      : "bg-zinc-700/50 w-0"
                    }`} />
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
                const statusColor = STATUS_COLOR[account.status] || STATUS_COLOR.submitted;
                return (
                  <button key={account.requestId}
                    onClick={() => account.requestId ? router.push(`/requests/${account.requestId}`) : undefined}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition hover:border-emerald-500/50 ${statusColor.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={`h-4 w-4 ${statusColor.text} ${["researching", "processing"].includes(account.status) ? "animate-spin" : ""}`} />
                          <span className="font-medium text-white">{account.targetName}</span>
                        </div>
                        <p className="text-sm text-zinc-400">{account.targetCompany}</p>
                        {account.status === "awaiting_clarification" && (
                          <p className="text-xs text-yellow-400/70 mt-1.5">Check email for clarification request</p>
                        )}
                        {account.currentStep && (<p className="text-xs text-zinc-500 mt-1.5">{account.currentStep}</p>)}
                      </div>
                      <span className={`text-xs font-medium ${statusColor.text} whitespace-nowrap ml-4`}>
                        {account.status === "awaiting_clarification" ? "Awaiting Clarification" : account.status.charAt(0).toUpperCase() + account.status.slice(1).replace("_", " ")}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (<p className="text-sm text-zinc-400">No accounts yet</p>)}
          </div>
        </div>

        {/* Synthesis Highlights */}
        {isComplete && batchJob.synthesisHighlights && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-emerald-300">Synthesis Highlights</h3>
            </div>
            {(batchJob.synthesisHighlights.topPriorityAccount || batchJob.synthesisHighlights.priorityRanking) && (
              <div>
                <p className="text-xs text-emerald-400/70 uppercase tracking-wide mb-1">Top Priority Account</p>
                <p className="text-white">
                  {batchJob.synthesisHighlights.topPriorityAccount ||
                    (Array.isArray(batchJob.synthesisHighlights.priorityRanking) && batchJob.synthesisHighlights.priorityRanking[0]?.account) ||
                    "See full report"}
                </p>
              </div>
            )}
            {(batchJob.synthesisHighlights.territoryStrategySummary || batchJob.synthesisHighlights.keyInsight) && (
              <div>
                <p className="text-xs text-emerald-400/70 uppercase tracking-wide mb-1">Territory Strategy</p>
                <p className="text-white text-sm leading-relaxed">
                  {batchJob.synthesisHighlights.territoryStrategySummary || batchJob.synthesisHighlights.keyInsight || "See full report"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Batch Assets */}
        {isComplete && batchJob.batchAssetUrls && batchJob.batchAssetUrls.length > 0 && (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Batch Assets</h3>
            <div className="space-y-2">
              {batchJob.batchAssetUrls.map((asset: any, idx: number) => (
                <a key={idx} href={asset.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-800/20 px-4 py-3 hover:bg-zinc-800/40 transition">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  <span className="flex-1 text-sm font-medium text-white">{asset.label || asset.id || `Asset ${idx + 1}`}</span>
                  <span className="text-zinc-500">↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Status Message */}
        {isComplete && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-950/30 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">
              Batch processing{" "}
              {batchJob.status === "completed" || batchJob.status === "delivered"
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
