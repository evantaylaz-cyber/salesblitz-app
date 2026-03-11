"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Send,
  ChevronDown,
  ChevronUp,
  Zap,
  ExternalLink,
  Copy,
  User as UserIcon,
} from "lucide-react";

interface AdminRequest {
  id: string;
  toolName: string;
  status: string;
  priority: boolean;
  targetName: string;
  targetCompany: string;
  targetRole: string | null;
  jobDescription: string | null;
  linkedinUrl: string | null;
  linkedinText: string | null;
  additionalNotes: string | null;
  deliveryUrl: string | null;
  deliveryNotes: string | null;
  adminNotes: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  user: {
    email: string;
    name: string | null;
    currentTier: string | null;
    priorityProcessing: boolean;
  };
}

const TOOL_NAMES: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  prospect_outreach: "Prospect Outreach",
  interview_prep: "Interview Prep",
  prospect_prep: "Prospect Prep",
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
};

const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: React.ElementType; color: string }> = {
  submitted: { next: "in_progress", label: "Start Working", icon: Play, color: "bg-amber-600 hover:bg-amber-700" },
  in_progress: { next: "ready", label: "Mark Ready", icon: CheckCircle2, color: "bg-emerald-600 hover:bg-emerald-600" },
  ready: { next: "delivered", label: "Mark Delivered", icon: Send, color: "bg-emerald-600 hover:bg-emerald-600" },
};

export default function AdminPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("submitted");
  const [updating, setUpdating] = useState<string | null>(null);

  // Delivery form state
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (isLoaded) fetchRequests();
  }, [isLoaded, statusFilter]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/requests${params}`);
      if (res.status === 403) {
        setError("Access denied. Admin only.");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch (e) {
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(requestId: string, newStatus: string) {
    setUpdating(requestId);
    try {
      const body: Record<string, unknown> = { requestId, status: newStatus };
      if (deliveryUrl) body.deliveryUrl = deliveryUrl;
      if (deliveryNotes) body.deliveryNotes = deliveryNotes;
      if (adminNotes) body.adminNotes = adminNotes;

      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setDeliveryUrl("");
        setDeliveryNotes("");
        setAdminNotes("");
        setExpandedId(null);
        await fetchRequests();
      }
    } catch (e) {
      console.error("Update failed:", e);
    } finally {
      setUpdating(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-3 text-neutral-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-[#141414]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-white">Fulfillment Queue</h1>
            <p className="text-sm text-neutral-400">{requests.length} requests</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-neutral-300 hover:text-white">Dashboard</a>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {/* Filter tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {["submitted", "in_progress", "ready", "delivered", "failed", ""].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                statusFilter === s
                  ? "bg-emerald-600 text-white"
                  : "bg-[#141414] border border-[#333333] text-neutral-300 hover:bg-[#0a0a0a]"
              }`}
            >
              {s === "" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="mx-auto h-12 w-12 text-neutral-500" />
            <p className="mt-4 text-neutral-400">No requests with this status.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const isExpanded = expandedId === req.id;
              const action = STATUS_ACTIONS[req.status];
              const isUpdating = updating === req.id;

              return (
                <div key={req.id} className="rounded-xl border bg-[#141414] shadow-sm shadow-black/20">
                  {/* Summary row */}
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : req.id);
                      setAdminNotes(req.adminNotes || "");
                      setDeliveryUrl(req.deliveryUrl || "");
                      setDeliveryNotes(req.deliveryNotes || "");
                    }}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#0a0a0a] transition rounded-xl"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {req.priority && <Zap className="h-4 w-4 text-amber-500 shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">
                            {TOOL_NAMES[req.toolName]}
                          </span>
                          <span className="text-neutral-500 text-sm">·</span>
                          <span className="text-sm text-neutral-300 truncate">
                            {req.targetName} @ {req.targetCompany}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-neutral-500">
                            {req.user.email} · {req.user.currentTier || "no plan"}
                          </span>
                          <span className="text-xs text-neutral-500">
                            · {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          req.status === "submitted"
                            ? "bg-blue-500/10 text-blue-400"
                            : req.status === "in_progress"
                            ? "bg-amber-500/10 text-amber-400"
                            : req.status === "ready" || req.status === "delivered"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {req.status === "in_progress" ? "In Progress" : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-neutral-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t px-5 py-4 space-y-4">
                      {/* Customer inputs */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                            Target Details
                          </h4>
                          <div className="rounded-lg bg-[#0a0a0a] p-3 space-y-1.5 text-sm">
                            <p><strong>Name:</strong> {req.targetName}</p>
                            <p><strong>Company:</strong> {req.targetCompany}</p>
                            {req.targetRole && <p><strong>Role:</strong> {req.targetRole}</p>}
                            {req.linkedinUrl && (
                              <p>
                                <strong>LinkedIn:</strong>{" "}
                                <a href={req.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">
                                  Profile <ExternalLink className="h-3 w-3" />
                                </a>
                              </p>
                            )}
                          </div>
                        </div>

                        {req.linkedinText && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                                LinkedIn Text
                              </h4>
                              <button
                                onClick={() => copyToClipboard(req.linkedinText!)}
                                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                              >
                                <Copy className="h-3 w-3" /> Copy
                              </button>
                            </div>
                            <div className="rounded-lg bg-[#0a0a0a] p-3 text-sm text-neutral-200 max-h-40 overflow-y-auto whitespace-pre-wrap">
                              {req.linkedinText}
                            </div>
                          </div>
                        )}
                      </div>

                      {req.jobDescription && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                              Job Description / Context
                            </h4>
                            <button
                              onClick={() => copyToClipboard(req.jobDescription!)}
                              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                            >
                              <Copy className="h-3 w-3" /> Copy
                            </button>
                          </div>
                          <div className="rounded-lg bg-[#0a0a0a] p-3 text-sm text-neutral-200 max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {req.jobDescription}
                          </div>
                        </div>
                      )}

                      {req.additionalNotes && (
                        <div>
                          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                            Additional Notes from Customer
                          </h4>
                          <div className="rounded-lg bg-[#0a0a0a] p-3 text-sm text-neutral-200 whitespace-pre-wrap">
                            {req.additionalNotes}
                          </div>
                        </div>
                      )}

                      {/* Admin controls */}
                      <div className="border-t pt-4 space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                            Delivery URL (Google Drive link)
                          </label>
                          <input
                            type="url"
                            value={deliveryUrl}
                            onChange={(e) => setDeliveryUrl(e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                            Delivery Notes (visible to customer)
                          </label>
                          <textarea
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            rows={2}
                            placeholder="e.g., Your Interview Prep package is ready. Includes POV deck, prep sheet, and outreach sequence."
                            className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                            Admin Notes (internal only)
                          </label>
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={2}
                            placeholder="Internal notes..."
                            className="mt-1 w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          {action && (
                            <button
                              onClick={() => updateStatus(req.id, action.next)}
                              disabled={isUpdating}
                              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition ${action.color} disabled:opacity-50`}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <action.icon className="h-4 w-4" />
                              )}
                              {action.label}
                            </button>
                          )}
                          {req.status !== "failed" && req.status !== "delivered" && (
                            <button
                              onClick={() => updateStatus(req.id, "failed")}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-[#141414] px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                            >
                              <AlertCircle className="h-4 w-4" />
                              Mark Failed
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
