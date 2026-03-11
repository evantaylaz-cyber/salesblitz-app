"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
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
  Filter,
  ChevronDown,
} from "lucide-react";
import AppNav from "@/components/AppNav";

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
  practice_mode: "AI Practice Mode",
  competitor_research: "Competitor Research",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  submitted: { label: "Queued", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: Clock },
  researching: { label: "Researching", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Loader2 },
  generating: { label: "Generating", color: "text-green-400", bg: "bg-green-500/10 border-green-200", icon: Loader2 },
  in_progress: { label: "In Progress", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Loader2 },
  ready: { label: "Ready", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  delivered: { label: "Delivered", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: AlertCircle },
  awaiting_clarification: { label: "Your Input Needed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: MessageCircleQuestion },
};

const BATCH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  processing: { label: "Processing", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Loader2 },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  delivered: { label: "Delivered", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: AlertCircle },
  partial: { label: "Partial", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: AlertCircle },
  submitted: { label: "Queued", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: Clock },
  awaiting_clarification: { label: "Your Input Needed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: MessageCircleQuestion },
};

type StatusFilter = "all" | "active" | "completed" | "failed" | "needs_input";
type SortOrder = "newest" | "oldest";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
  { key: "needs_input", label: "Needs Input" },
];

function matchesStatusFilter(status: string, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return ["submitted", "researching", "generating", "in_progress"].includes(status);
  if (filter === "completed") return ["ready", "delivered", "completed"].includes(status);
  if (filter === "failed") return status === "failed";
  if (filter === "needs_input") return status === "awaiting_clarification";
  return true;
}

export default function RequestsPage() {
  const { isLoaded } = useUser();
  const [requests, setRequests] = useState<RunRequest[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // Derive unique tool names for filter dropdown
  const toolNames = Array.from(new Set(requests.map((r) => r.toolName)));

  // Apply filters and sorting
  const filteredRequests = requests
    .filter((r) => matchesStatusFilter(r.status, statusFilter))
    .filter((r) => toolFilter === "all" || r.toolName === toolFilter)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const filteredBatches = batchJobs
    .filter((b) => matchesStatusFilter(b.status, statusFilter))
    .filter((b) => toolFilter === "all" || b.toolName === toolFilter)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const hasContent = requests.length > 0 || batchJobs.length > 0;
  const hasFilteredContent = filteredRequests.length > 0 || filteredBatches.length > 0;
  const isFiltered = statusFilter !== "all" || toolFilter !== "all";

  // Count per status for filter badges
  const statusCounts = {
    all: requests.length + batchJobs.length,
    active: requests.filter((r) => matchesStatusFilter(r.status, "active")).length +
            batchJobs.filter((b) => matchesStatusFilter(b.status, "active")).length,
    completed: requests.filter((r) => matchesStatusFilter(r.status, "completed")).length +
               batchJobs.filter((b) => matchesStatusFilter(b.status, "completed")).length,
    failed: requests.filter((r) => matchesStatusFilter(r.status, "failed")).length +
            batchJobs.filter((b) => matchesStatusFilter(b.status, "failed")).length,
    needs_input: requests.filter((r) => matchesStatusFilter(r.status, "needs_input")).length +
                 batchJobs.filter((b) => matchesStatusFilter(b.status, "needs_input")).length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav currentPage="/requests" />

      {/* Requests action bar */}
      <div className="border-b bg-[#141414]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <h1 className="text-lg font-bold text-white">My Requests</h1>
          <a
            href="/request/batch"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition"
          >
            <Layers className="h-4 w-4" />
            New Blitz
          </a>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Filters */}
        {hasContent && (
          <div className="mb-6 space-y-3">
            {/* Status filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {STATUS_FILTERS.map((f) => {
                const count = statusCounts[f.key];
                const isActive = statusFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition whitespace-nowrap ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-neutral-400 hover:bg-[#1a1a1a] hover:text-neutral-200"
                    }`}
                  >
                    {f.label}
                    {count > 0 && (
                      <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                        isActive ? "bg-emerald-200 text-emerald-300" : "bg-[#1a1a1a] text-neutral-500"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tool filter + sort row */}
            <div className="flex items-center gap-3">
              {toolNames.length > 1 && (
                <div className="relative">
                  <select
                    value={toolFilter}
                    onChange={(e) => setToolFilter(e.target.value)}
                    className="appearance-none rounded-lg border border-[#262626] bg-[#141414] pl-3 pr-8 py-1.5 text-sm text-neutral-200 hover:border-[#333333] focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                  >
                    <option value="all">All tools</option>
                    {toolNames.map((t) => (
                      <option key={t} value={t}>
                        {TOOL_NAMES[t] || t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
                </div>
              )}

              <div className="relative ml-auto">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="appearance-none rounded-lg border border-[#262626] bg-[#141414] pl-3 pr-8 py-1.5 text-sm text-neutral-200 hover:border-[#333333] focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {!hasContent ? (
          <div className="text-center py-16">
            <Package className="mx-auto h-12 w-12 text-neutral-500" />
            <p className="mt-4 text-neutral-400">No requests yet.</p>
            <a
              href="/dashboard"
              className="mt-4 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              Start a blitz from the dashboard
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Empty filter state */}
            {isFiltered && !hasFilteredContent && (
              <div className="text-center py-12">
                <Filter className="mx-auto h-10 w-10 text-neutral-500" />
                <p className="mt-3 text-neutral-400">No requests match your filters.</p>
                <button
                  onClick={() => { setStatusFilter("all"); setToolFilter("all"); }}
                  className="mt-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Batch Jobs Section */}
            {filteredBatches.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-base font-semibold text-white">Batch Jobs</h2>
                  <span className="text-xs text-neutral-500 ml-1">({filteredBatches.length})</span>
                </div>
                <div className="space-y-3">
                  {filteredBatches.map((batch) => {
                    const statusInfo = BATCH_STATUS_CONFIG[batch.status] || BATCH_STATUS_CONFIG.submitted;
                    const StatusIcon = statusInfo.icon;
                    const isActive = batch.status === "processing" || batch.status === "submitted";
                    const totalAccounts = Array.isArray(batch.accounts) ? batch.accounts.length : 0;
                    const children = Array.isArray(batch.childRequests) ? batch.childRequests : [];
                    const completedAccounts = children.filter((c) =>
                      c.status === "delivered" || c.status === "ready" || c.status === "completed"
                    ).length;
                    const failedAccounts = children.filter((c) => c.status === "failed").length;
                    const awaitingAccounts = children.filter((c) => c.status === "awaiting_clarification").length;
                    const progress = totalAccounts > 0 ? Math.round((completedAccounts / totalAccounts) * 100) : 0;

                    return (
                      <a
                        key={batch.id}
                        href={`/batch/${batch.id}`}
                        className="block rounded-xl border bg-[#141414] p-5 shadow-sm shadow-black/20 hover:shadow-md hover:border-emerald-500/20 transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-white">
                                {TOOL_NAMES[batch.toolName] || batch.toolName}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
                              >
                                <StatusIcon className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                                {statusInfo.label}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#0a0a0a] border border-[#262626] px-2 py-0.5 text-xs font-medium text-neutral-300">
                                <Users className="h-3 w-3" />
                                {totalAccounts} accounts
                              </span>
                            </div>

                            {/* Batch progress bar */}
                            <div className="mt-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs text-neutral-400">
                                  {completedAccounts} of {totalAccounts} completed
                                  {failedAccounts > 0 && (
                                    <span className="text-red-500 ml-1">({failedAccounts} failed)</span>
                                  )}
                                  {awaitingAccounts > 0 && (
                                    <span className="text-emerald-400 ml-1">({awaitingAccounts} awaiting input)</span>
                                  )}
                                </span>
                                <span className="text-xs text-neutral-500 ml-auto">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    batch.status === "failed"
                                      ? "bg-red-400"
                                      : batch.status === "partial"
                                      ? "bg-amber-400"
                                      : batch.status === "awaiting_clarification"
                                      ? "bg-emerald-400"
                                      : progress === 100
                                      ? "bg-emerald-500/100"
                                      : "bg-emerald-500/100"
                                  }`}
                                  style={{ width: `${Math.max(progress, batch.status === "awaiting_clarification" ? 10 : 0)}%` }}
                                />
                              </div>
                            </div>

                            <p className="mt-2 text-xs text-neutral-500">
                              Submitted {new Date(batch.createdAt).toLocaleDateString()} at{" "}
                              {new Date(batch.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            {batch.status === "awaiting_clarification" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
                                <MessageCircleQuestion className="h-4 w-4" />
                                Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm text-neutral-500">
                                <ArrowRight className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Individual Requests Section */}
            {filteredRequests.length > 0 && (
              <section>
                {filteredBatches.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-base font-semibold text-white">Individual Requests</h2>
                    <span className="text-xs text-neutral-500 ml-1">({filteredRequests.length})</span>
                  </div>
                )}
                <div className="space-y-4">
                  {filteredRequests.map((req) => {
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
                        className="block rounded-xl border bg-[#141414] p-5 shadow-sm shadow-black/20 hover:shadow-md hover:border-emerald-500/20 transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-white">
                                {TOOL_NAMES[req.toolName] || req.toolName}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
                              >
                                <StatusIcon className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                                {statusInfo.label}
                              </span>
                              {req.priority && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                                  <Zap className="h-3 w-3" />
                                  Priority
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-neutral-300">
                              {req.targetName} · {req.targetCompany}
                              {req.targetRole ? ` · ${req.targetRole}` : ""}
                            </p>
                            {totalSteps > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  {activeStep && (
                                    <p className="text-xs text-emerald-400 font-medium">
                                      {activeStep.label}
                                    </p>
                                  )}
                                  <span className="text-xs text-neutral-500 ml-auto">
                                    {completedSteps}/{totalSteps} steps
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      req.status === "failed"
                                        ? "bg-red-400"
                                        : progress === 100
                                        ? "bg-emerald-500/100"
                                        : "bg-emerald-500/100"
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            <p className="mt-2 text-xs text-neutral-500">
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
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-emerald-600 transition"
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
