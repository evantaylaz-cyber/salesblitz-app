"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Package,
  Zap,
  MessageCircleQuestion,
  Layers,
  Users,
  ArrowRight,
} from "lucide-react";

interface StepData {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

interface AssetData {
  id: string;
  url: string | null;
}

interface RunRequest {
  id: string;
  toolName: string;
  status: string;
  priority: boolean;
  targetName: string;
  targetCompany: string;
  targetRole: string | null;
  currentStep: string | null;
  steps: StepData[];
  assets: AssetData[];
  deliveryUrl: string | null;
  deliveryNotes: string | null;
  createdAt: string;
  completedAt: string | null;
  deliveredAt: string | null;
}

interface BatchChildRequest {
  id: string;
  targetName: string;
  targetCompany: string;
  status: string;
  batchIndex: number;
}

interface BatchJob {
  id: string;
  toolName: string;
  batchType: string;
  status: string;
  accounts: Array<{ targetName: string; targetCompany: string; targetRole?: string }>;
  childRequests: BatchChildRequest[];
  createdAt: string;
  updatedAt: string;
}

const TOOL_NAMES: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  prospect_outreach: "Prospect Outreach",
  interview_prep: "Interview Prep",
  prospect_prep: "Prospect Prep",
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  submitted: { label: "Queued", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Clock },
  researching: { label: "Researching", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Loader2 },
  generating: { label: "Generating", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Loader2 },
  in_progress: { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Loader2 },
  ready: { label: "Ready", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  delivered: { label: "Delivered", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertCircle },
  awaiting_clarification: { label: "Your Input Needed", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: MessageCircleQuestion },
};

const BATCH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  processing: { label: "Processing", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Loader2 },
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  delivered: { label: "Delivered", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertCircle },
  partial: { label: "Partial", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: AlertCircle },
  submitted: { label: "Queued", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Clock },
};

export default function RequestsPage() {
  const { isLoaded } = useUser();
  const [requests, setRequests] = useState<RunRequest[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) fetchAll();
  }, [isLoaded]);

  async function fetchAll() {
    try {
      const [reqRes, batchRes] = await Promise.all([
        fetch("/api/requests"),
        fetch("/api/batch-requests"),
      ]);
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests || []);
      }
      if (batchRes.ok) {
        const data = await batchRes.json();
        setBatchJobs(data.batchJobs || []);
      }
    } catch (e) {
      console.error("Failed to fetch:", e);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const hasContent = requests.length > 0 || batchJobs.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <h1 className="text-lg font-bold text-gray-900">My Requests</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/request/batch"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              <Layers className="h-4 w-4" />
              New Batch
            </a>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {!hasContent ? (
          <div className="text-center py-16">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No requests yet.</p>
            <a
              href="/dashboard"
              className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Run a tool from the dashboard
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Batch Jobs Section */}
            {batchJobs.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-base font-semibold text-gray-900">Batch Jobs</h2>
                  <span className="text-xs text-gray-400 ml-1">({batchJobs.length})</span>
                </div>
                <div className="space-y-3">
                  {batchJobs.map((batch) => {
                    const statusInfo = BATCH_STATUS_CONFIG[batch.status] || BATCH_STATUS_CONFIG.submitted;
                    const StatusIcon = statusInfo.icon;
                    const isActive = batch.status === "processing" || batch.status === "submitted";
                    const totalAccounts = Array.isArray(batch.accounts) ? batch.accounts.length : 0;
                    const children = Array.isArray(batch.childRequests) ? batch.childRequests : [];
                    const completedAccounts = children.filter((c) => c.status === "delivered" || c.status === "ready" || c.status === "completed").length;
                    const failedAccounts = children.filter((c) => c.status === "failed").length;
                    const progress = totalAccounts > 0 ? Math.round((completedAccounts / totalAccounts) * 100) : 0;

                    return (
                      <a
                        key={batch.id}
                        href={`/batch/${batch.id}`}
                        className="block rounded-xl border bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">
                                {TOOL_NAMES[batch.toolName] || batch.toolName}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
                              >
                                <StatusIcon className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                                {statusInfo.label}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                                <Users className="h-3 w-3" />
                                {totalAccounts} accounts
                              </span>
                            </div>

                            {/* Batch progress bar */}
                            <div className="mt-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs text-gray-500">
                                  {completedAccounts} of {totalAccounts} completed
                                  {failedAccounts > 0 && (
                                    <span className="text-red-500 ml-1">({failedAccounts} failed)</span>
                                  )}
                                </span>
                                <span className="text-xs text-gray-400 ml-auto">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    batch.status === "failed" ? "bg-red-400" :
                                    batch.status === "partial" ? "bg-amber-400" :
                                    progress === 100 ? "bg-emerald-500" :
                                    "bg-indigo-500"
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>

                            <p className="mt-2 text-xs text-gray-400">
                              Submitted {new Date(batch.createdAt).toLocaleDateString()} at{" "}
                              {new Date(batch.createdAt).toLocaleTimeString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                              <ArrowRight className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Individual Requests Section */}
            {requests.length > 0 && (
              <section>
                {batchJobs.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-base font-semibold text-gray-900">Individual Requests</h2>
                    <span className="text-xs text-gray-400 ml-1">({requests.length})</span>
                  </div>
                )}
                <div className="space-y-4">
                  {requests.map((req) => {
                    const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted;
                    const StatusIcon = statusInfo.icon;

                    const steps = Array.isArray(req.steps) ? req.steps as StepData[] : [];
                    const completedSteps = steps.filter((s) => s.status === "completed").length;
                    const totalSteps = steps.length;
                    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                    const activeStep = steps.find((s) => s.status === "in_progress");
                    const isActive = ["submitted", "researching", "generating"].includes(req.status);
                    const hasAssets = Array.isArray(req.assets) && (req.assets as AssetData[]).some((a) => a.url);

                    return (
                      <a
                        key={req.id}
                        href={`/requests/${req.id}`}
                        className="block rounded-xl border bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">
                                {TOOL_NAMES[req.toolName] || req.toolName}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
                              >
                                <StatusIcon className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                                {statusInfo.label}
                              </span>
                              {req.priority && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  <Zap className="h-3 w-3" /> Priority
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              {req.targetName} · {req.targetCompany}
                              {req.targetRole ? ` · ${req.targetRole}` : ""}
                            </p>

                            {totalSteps > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  {activeStep && (
                                    <p className="text-xs text-indigo-600 font-medium">
                                      {activeStep.label}
                                    </p>
                                  )}
                                  <span className="text-xs text-gray-400 ml-auto">
                                    {completedSteps}/{totalSteps} steps
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      req.status === "failed" ? "bg-red-400" :
                                      progress === 100 ? "bg-emerald-500" :
                                      "bg-indigo-500"
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <p className="mt-2 text-xs text-gray-400">
                              Submitted {new Date(req.createdAt).toLocaleDateString()} at{" "}
                              {new Date(req.createdAt).toLocaleTimeString()}
                              {req.completedAt && (
                                <> · Completed {new Date(req.completedAt).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>

                          {req.status === "awaiting_clarification" ? (
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              <span
                                onClick={(e) => {
                                  e.preventDefault();
                                  window.location.href = `/request/${req.id}/clarify`;
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-indigo-700 transition"
                              >
                                <MessageCircleQuestion className="h-4 w-4" />
                                Answer
                              </span>
                            </div>
                          ) : (hasAssets || req.deliveryUrl) ? (
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
                                <ExternalLink className="h-4 w-4" />
                                View
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
