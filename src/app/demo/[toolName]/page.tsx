"use client";

import { useParams } from "next/navigation";
import { getDemoRun, getAllDemoTools, DemoRun } from "@/lib/demo-data";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Zap,
  Search,
  Sparkles,
  Package,
  Download,
  Eye,
  ArrowRight,
} from "lucide-react";

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
  building_competitive_playbook: Zap,
  generating_gamma_deck: Sparkles,
  generating_outreach_sequence: FileText,
  formatting: Package,
  delivery: Download,
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
  png: "🖼️",
};

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function DemoRunPage() {
  const params = useParams();
  const toolName = params.toolName as string;
  const demoRun = getDemoRun(toolName);
  const allDemos = getAllDemoTools();

  if (!demoRun) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Demo not found for this tool.</p>
          <a href="/demo/prospect_prep" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
            View Prospect Prep demo instead
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">
                  {TOOL_NAMES[demoRun.toolName] || demoRun.toolName}
                </h1>
                <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                  Sample
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {demoRun.targetName} · {demoRun.targetCompany}
                {demoRun.targetRole ? ` · ${demoRun.targetRole}` : ""}
              </p>
            </div>
          </div>
          <a
            href="/subscribe"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            <Zap className="h-4 w-4" />
            Run Your Own
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* Demo Banner */}
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <Eye className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Sample Run Preview</h3>
              <p className="mt-1 text-sm text-gray-600">
                This shows what a completed {TOOL_NAMES[demoRun.toolName]} deliverable package looks like.
                Asset downloads are disabled in demo mode. Subscribe to run your own with real data.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar - completed state */}
        <div className="rounded-xl border ring-1 ring-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-emerald-700">Delivered</span>
            <span className="text-sm font-medium text-emerald-700">100%</span>
          </div>
          <div className="h-2 rounded-full bg-white/60 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: "100%" }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {demoRun.completedSteps} of {demoRun.totalSteps} steps completed
            · Finished in {formatDuration(demoRun.startedAt, demoRun.completedAt)}
          </p>
        </div>

        {/* Execution Steps */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">Execution Progress</h2>
          </div>
          <div className="divide-y">
            {demoRun.steps.map((step, i) => {
              const StepIcon = STEP_ICONS[step.id] || FileText;
              return (
                <div key={step.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="mt-0.5 flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StepIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{step.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{step.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDuration(step.startedAt, step.completedAt)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-300 font-mono mt-1">
                    {i + 1}/{demoRun.totalSteps}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assets / Deliverables */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">Your Deliverables</h2>
          </div>
          <div className="divide-y">
            {(["interactive", "research", "deliverable"] as const).map((category) => {
              const categoryAssets = demoRun.assets.filter((a) => a.category === category);
              if (categoryAssets.length === 0) return null;

              const catInfo = ASSET_CATEGORY_LABELS[category];
              return (
                <div key={category} className="px-6 py-4">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${catInfo.color} mb-3`}>
                    {catInfo.label}
                  </span>
                  <div className="space-y-2">
                    {categoryAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 bg-gray-50/50 opacity-75"
                      >
                        <span className="text-lg">{FORMAT_ICONS[asset.format] || "📄"}</span>
                        <span className="flex-1 text-sm font-medium text-gray-600">
                          {asset.label}
                        </span>
                        <span className="text-xs text-gray-400 uppercase">{asset.format}</span>
                        {asset.size && (
                          <span className="text-xs text-gray-300">
                            {Math.round(asset.size / 1024)}KB
                          </span>
                        )}
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                          Demo
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Notes */}
        {demoRun.deliveryNotes && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-500">{demoRun.deliveryNotes}</p>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-6 text-center">
          <h3 className="text-lg font-bold text-gray-900">Ready to run your own?</h3>
          <p className="mt-2 text-sm text-gray-600">
            Get a complete deliverable package for your actual prospects, interviewers, or accounts.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <a
              href="/subscribe"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              <Zap className="h-4 w-4" />
              Get Started
            </a>
          </div>
        </div>

        {/* Other Demos */}
        {allDemos.filter((d) => d.toolName !== toolName).length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              More Sample Runs
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {allDemos
                .filter((d) => d.toolName !== toolName)
                .map((d) => (
                  <a
                    key={d.toolName}
                    href={`/demo/${d.toolName}`}
                    className="flex items-center justify-between rounded-xl border bg-white px-5 py-4 hover:border-indigo-200 hover:shadow-sm transition group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">
                        {TOOL_NAMES[d.toolName] || d.toolName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {d.targetName} · {d.targetCompany}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500" />
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="text-center text-xs text-gray-400 pb-8">
          Demo ID: {demoRun.id} · Sample data only
        </div>
      </main>
    </div>
  );
}
