"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Loader2,
  ExternalLink,
  Shield,
  Building2,
  Calendar,
  Globe,
  Zap,
  Search,
} from "lucide-react";
import AppNav from "@/components/AppNav";

interface PlaybookRun {
  id: string;
  toolName: string;
  targetName: string;
  targetCompany: string;
  targetRole: string | null;
  status: string;
  playbookUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  deliveredAt: string | null;
}

interface CompanyGroup {
  company: string;
  runs: PlaybookRun[];
  latestRun: string;
  hasPlaybook: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  interview_prep: "Interview Prep",
  prospect_outreach: "Prospect Outreach",
  prospect_prep: "Prospect Prep",
  champion_builder: "Champion Builder",
  competitor_research: "Competitor Research",
  deal_audit: "Deal Audit",
};

const TOOL_COLORS: Record<string, string> = {
  interview_outreach: "bg-emerald-100 text-emerald-700",
  interview_prep: "bg-emerald-100 text-emerald-700",
  prospect_outreach: "bg-blue-100 text-blue-700",
  prospect_prep: "bg-blue-100 text-blue-700",
  champion_builder: "bg-amber-100 text-amber-700",
  competitor_research: "bg-emerald-100 text-emerald-700",
  deal_audit: "bg-rose-100 text-rose-700",
};

export default function PlaybooksPage() {
  const { isLoaded } = useUser();
  const [companies, setCompanies] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalRuns, setTotalRuns] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;

    async function fetchPlaybooks() {
      try {
        const res = await fetch("/api/playbooks");
        if (!res.ok) throw new Error("Failed to fetch playbooks");
        const data = await res.json();
        setCompanies(data.companies || []);
        setTotalRuns(data.totalRuns || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchPlaybooks();
  }, [isLoaded]);

  const filteredCompanies = searchQuery.trim()
    ? companies.filter(
        (c) =>
          c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.runs.some((r) =>
            r.targetName?.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : companies;

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav currentPage="/playbooks" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Competitive Playbooks
          </h2>
          <p className="text-gray-600 mt-1">
            Interactive competitive positioning cards with value-based talk tracks, land
            mines, and multi-threading plays. Built automatically from your
            research runs.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Building2 className="h-4 w-4" />
              <span>{companies.length} companies</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Zap className="h-4 w-4" />
              <span>{totalRuns} total runs</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company or contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">{error}</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? "No matching playbooks" : "No playbooks yet"}
            </h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              {searchQuery
                ? "Try a different search term."
                : "Playbooks are generated automatically when you blitz Interview Prep, Prospect Prep, or other research tools. Submit your first request to get started."}
            </p>
            {!searchQuery && (
              <a
                href="/request"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Zap className="h-4 w-4" />
                New Request
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCompanies.map((group) => (
              <CompanyCard key={group.company} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyCard({ group }: { group: CompanyGroup }) {
  const [expanded, setExpanded] = useState(false);
  const latestRun = group.runs[0];
  const latestDate = new Date(group.latestRun).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Find the latest playbook URL
  const latestPlaybook = group.runs.find((r) => r.playbookUrl);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
      {/* Company header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{group.company}</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-500">
                {group.runs.length} run{group.runs.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {latestDate}
              </span>
              {group.hasPlaybook && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <Shield className="h-3 w-3" />
                    Playbook
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {latestPlaybook?.playbookUrl && (
            <a
              href={latestPlaybook.playbookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              Open Playbook
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            {expanded ? "Hide" : "All runs"} ▾
          </button>
        </div>
      </div>

      {/* Expanded runs list */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {group.runs.map((run) => (
            <div
              key={run.id}
              className="px-5 py-3 flex items-center justify-between bg-gray-50/50"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    TOOL_COLORS[run.toolName] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {TOOL_LABELS[run.toolName] || run.toolName}
                </span>
                <span className="text-sm text-gray-700">
                  {run.targetName}
                  {run.targetRole ? (
                    <span className="text-gray-400">, {run.targetRole}</span>
                  ) : null}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(run.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {run.playbookUrl && (
                  <a
                    href={run.playbookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <Shield className="h-3 w-3" />
                    Playbook
                  </a>
                )}
                <a
                  href={`/requests/${run.id}`}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  View run
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
