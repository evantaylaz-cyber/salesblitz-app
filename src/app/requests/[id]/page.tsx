"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useStepStream, StepUpdate } from "@/hooks/useStepStream";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  FileText,
  Globe,
  Zap,
  Search,
  Sparkles,
  Package,
  Download,
  MessageCircleQuestion,
  RefreshCw,
} from "lucide-react";

interface StepData {
  id: string;
  label: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface AssetData {
  id: string;
  label: string;
  format: string;
  url: string | null;
  size: number | null;
  category: "research" | "deliverable" | "interactive";
}

interface RequestDetail {
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
  progress: number;
  completedSteps: number;
  totalSteps: number;
  deliveryUrl: string | null;
  deliveryNotes: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
}

const TOOL_NAMES: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  prospect_outreach: "Prospect Outreach",
  interview_prep: "Interview Prep",
  prospect_prep: "Prospect Prep",
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
};

const STEP_ICONS: Record<string, React.ElementType> = {
  competitive_research: Search,
  market_intel: Globe,
  company_deep_dive: Search,
  generating_assets: Sparkles,
  building_landscape_app: Globe,
  building_competitive_playbook: Zap,
  generating_gamma_deck: Sparkles,
  generating_outreach_sequence: MessageCircleQuestion,
  formatting: Package,
  delivery: Download,
};

const STATUS_STYLES: Record<string, { ring: string; bg: string; text: string; icon: string }> = {
  submitted: { ring: "ring-blue-200", bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-400" },
  researching: { ring: "ring-amber-200", bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500" },
  generating: { ring: "ring-purple-200", bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500" },
  ready: { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500" },
  delivered: { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500" },
  failed: { ring: "ring-red-200", bg: "bg-red-50", text: "text-red-700", icon: "text-red-500" },
  awaiting_clarification: { ring: "ring-indigo-200", bg: "bg-indigo-50", text: "text-indigo-700", icon: "text-indigo-500" },
};

const ASSET_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  interactive: { label: "Interactive", color: "bg-indigo-100 text-indigo-700" },
  research: { label: "Research", color: "bg-blue-100 text-blue-700" },
  deliverable: { label: "Deliverable", color: "bg-emerald-100 text-emerald-700" },
};

const FORMAT_ICONS: Record<string, string> = {
  docx: "📄",
  pdf: "📋",
  pptx: "📊",
  url: "🌐",
  html: "🌐",
};

export default function RequestDetailPage() {
  const { isLoaded } = useUser();
  const params = useParams();
  const requestId = params.id as string;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}`);
      if (!res.ok) {
        setError("Request not found");
        return;
      }
      const data = await res.json();
      setRequest(data.request);
    } catch {
      setError("Failed to load request");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const retryRequest = useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        // Reset local state and start polling
        setError(null);
        await fetchRequest();
      } else {
        const data = await res.json();
        setError(data.error || "Retry failed");
      }
    } catch {
      setError("Network error — retry failed");
    } finally {
      setRetrying(false);
    }
  }, [requestId, fetchRequest]);

  useEffect(() => {
    if (isLoaded) fetchRequest();
  }, [isLoaded, fetchRequest]);

  // Real-time step updates via SSE (falls back to polling if SSE fails)
  const isActive = !!request && ["submitted", "researching", "generating", "awaiting_clarification"].includes(request.status);

  useStepStream({
    requestId: requestId,
    enabled: isActive,
    onUpdate: useCallback((data: StepUpdate) => {
      setRequest((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: data.status || prev.status,
          currentStep: data.currentStep ?? prev.currentStep,
          progress: data.progress ?? prev.progress,
          completedSteps: data.completedSteps ?? prev.completedSteps,
          totalSteps: data.totalSteps ?? prev.totalSteps,
          steps: (data.steps as StepData[]) || prev.steps,
          assets: (data.assets as AssetData[]) || prev.assets,
        };
      });
    }, []),
    onComplete: useCallback((status: string) => {
      // Do a final full fetch to get all data (delivery URL, notes, etc.)
      fetchRequest();
    }, [fetchRequest]),
  });

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-gray-600">{error || "Request not found"}</p>
          <a href="/requests" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
            ← Back to requests
          </a>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/requests" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {TOOL_NAMES[request.toolName] || request.toolName}
              </h1>
              <p className="text-sm text-gray-500">
                {request.targetName} · {request.targetCompany}
                {request.targetRole ? ` · ${request.targetRole}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {request.priority && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                <Zap className="h-3 w-3" /> Priority
              </span>
            )}
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* Progress Bar */}
        <div className={`rounded-xl border ${statusStyle.ring} ring-1 ${statusStyle.bg} p-6`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-semibold ${statusStyle.text} capitalize`}>
              {request.status === "researching" ? "Researching..." :
               request.status === "generating" ? "Generating deliverables..." :
               request.status === "ready" ? "Ready for download" :
               request.status === "delivered" ? "Delivered" :
               request.status === "failed" ? "Failed" :
               request.status === "awaiting_clarification" ? "Waiting for your input" :
               "Queued"}
            </span>
            <span className={`text-sm font-medium ${statusStyle.text}`}>
              {request.progress}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                request.status === "failed" ? "bg-red-500" :
                request.progress === 100 ? "bg-emerald-500" :
                "bg-indigo-500"
              }`}
              style={{ width: `${request.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {request.completedSteps} of {request.totalSteps} steps completed
            {request.startedAt && (
              <> · Started {new Date(request.startedAt).toLocaleTimeString()}</>
            )}
          </p>
        </div>

        {/* Clarification Banner */}
        {request.status === "awaiting_clarification" && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
            <div className="flex items-start gap-4">
              <MessageCircleQuestion className="h-6 w-6 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-indigo-900">We have a few questions</h3>
                <p className="mt-1 text-sm text-indigo-700">
                  Answering these will significantly improve your deliverables. Takes about 2 minutes.
                </p>
                <a
                  href={`/request/${request.id}/clarify`}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
                >
                  <MessageCircleQuestion className="h-4 w-4" />
                  Answer Questions
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Execution Steps */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">Execution Progress</h2>
          </div>
          <div className="divide-y">
            {request.steps.map((step, i) => {
              const StepIcon = STEP_ICONS[step.id] || FileText;
              const isActive = step.status === "in_progress";
              const isComplete = step.status === "completed";
              const isFailed = step.status === "failed";

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-4 px-6 py-4 transition ${
                    isActive ? "bg-indigo-50/50" : ""
                  }`}
                >
                  {/* Step indicator */}
                  <div className="mt-0.5 flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                    ) : isFailed ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StepIcon className={`h-4 w-4 ${
                        isActive ? "text-indigo-500" :
                        isComplete ? "text-gray-400" :
                        "text-gray-300"
                      }`} />
                      <span className={`text-sm font-medium ${
                        isActive ? "text-indigo-700" :
                        isComplete ? "text-gray-700" :
                        isFailed ? "text-red-700" :
                        "text-gray-400"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {(isActive || isComplete || isFailed) && (
                      <p className="mt-1 text-xs text-gray-500">{step.description}</p>
                    )}
                    {isFailed && step.error && (
                      <p className="mt-1 text-xs text-red-600">{step.error}</p>
                    )}
                    {isComplete && step.completedAt && (
                      <p className="mt-1 text-xs text-gray-400">
                        Completed at {new Date(step.completedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  {/* Step number */}
                  <span className="text-xs text-gray-300 font-mono mt-1">
                    {i + 1}/{request.totalSteps}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assets / Deliverables */}
        {request.assets.some((a: AssetData) => a.url) && (
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold text-gray-900">Your Deliverables</h2>
            </div>
            <div className="divide-y">
              {(["interactive", "research", "deliverable"] as const).map((category) => {
                const categoryAssets = request.assets.filter(
                  (a: AssetData) => a.category === category && a.url
                );
                if (categoryAssets.length === 0) return null;

                const catInfo = ASSET_CATEGORY_LABELS[category];
                return (
                  <div key={category} className="px-6 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${catInfo.color} mb-3`}>
                      {catInfo.label}
                    </span>
                    <div className="space-y-2">
                      {categoryAssets.map((asset: AssetData) => (
                        <a
                          key={asset.id}
                          href={asset.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50 hover:border-gray-200 transition group"
                        >
                          <span className="text-lg">{FORMAT_ICONS[asset.format] || "📄"}</span>
                          <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            {asset.label}
                          </span>
                          <span className="text-xs text-gray-400 uppercase">{asset.format}</span>
                          <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-indigo-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error State */}
        {request.status === "failed" && request.errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Execution Failed</h3>
                <p className="mt-1 text-sm text-red-700">{request.errorMessage}</p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={retryRequest}
                    disabled={retrying}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {retrying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {retrying ? "Retrying..." : "Retry This Run"}
                  </button>
                  <span className="text-xs text-gray-500">No additional credits consumed</span>
                </div>
                <p className="mt-3 text-xs text-red-600">
                  Our team has been notified. You can also reach us at support@alternativeinvestments.io
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="text-center text-xs text-gray-400 pb-8">
          Request ID: {request.id} · Submitted {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
        </div>
      </main>
    </div>
  );
}
