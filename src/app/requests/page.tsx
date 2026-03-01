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

export default function RequestsPage() {
  const { isLoaded } = useUser();
  const [requests, setRequests] = useState<RunRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) fetchRequests();
  }, [isLoaded]);

  async function fetchRequests() {
    try {
      const res = await fetch("/api/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch (e) {
      console.error("Failed to fetch requests:", e);
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
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {requests.length === 0 ? (
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
          <div className="space-y-4">
            {requests.map((req) => {
              const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted;
              const StatusIcon = statusInfo.icon;

              // Calculate step progress
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

                      {/* Step progress bar */}
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
        )}
      </main>
    </div>
  );
}
