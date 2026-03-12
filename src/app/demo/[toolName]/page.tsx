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
  Shield,
  BarChart3,
  Users,
  Mic,
} from "lucide-react";

const TOOL_NAMES: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  prospect_outreach: "Prospect Outreach",
  interview_prep: "Interview Prep",
  prospect_prep: "Prospect Prep",
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
};

const TOOL_HOOKS: Record<string, string> = {
  interview_outreach: "Land the interview before you walk in.",
  prospect_outreach: "Get the meeting. Every touch is research-backed.",
  interview_prep: "Walk in more prepared than anyone at the table.",
  prospect_prep: "Own the conversation from the first minute.",
  deal_audit: "Stress-test your deal. No hiding from reality.",
  champion_builder: "Arm your champion to sell when you're not in the room.",
};

const STEP_ICONS: Record<string, React.ElementType> = {
  competitive_research: Search,
  market_intel: Globe,
  company_deep_dive: Search,
  generating_assets: Sparkles,
  generating_outreach_sequence: FileText,
  formatting: Package,
  delivery: Download,
};

const ASSET_CATEGORY_META: Record<string, { label: string; description: string; icon: React.ElementType }> = {
  interactive: {
    label: "Interactive Assets",
    description: "Bookmark for quick reference during or before calls.",
    icon: Globe,
  },
  research: {
    label: "Research Materials",
    description: "Deep study material. Read before the call, not during.",
    icon: Search,
  },
  deliverable: {
    label: "Deliverables",
    description: "Call docs go on-screen. Cards and decks are for sending.",
    icon: Package,
  },
};

const FORMAT_LABELS: Record<string, { label: string; color: string }> = {
  pdf: { label: "PDF", color: "bg-red-500/20 text-red-400" },
  docx: { label: "DOCX", color: "bg-blue-500/20 text-blue-400" },
  pptx: { label: "PPTX", color: "bg-orange-500/20 text-orange-400" },
  url: { label: "WEB", color: "bg-emerald-500/20 text-emerald-400" },
  html: { label: "HTML", color: "bg-emerald-500/20 text-emerald-400" },
  png: { label: "PNG", color: "bg-purple-500/20 text-purple-400" },
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <p className="text-gray-400">Demo not found for this tool.</p>
          <a href="/demo/prospect_prep" className="mt-4 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">
            View Prospect Prep demo instead
          </a>
        </div>
      </div>
    );
  }

  const totalDuration = formatDuration(demoRun.startedAt, demoRun.completedAt);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Nav - matches marketing site */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#262626] bg-[#0a0a0a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 font-bold text-white text-lg">
              <img src="/logo.svg" alt="Sales Blitz" className="h-7 w-7" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              Sales Blitz
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm font-medium text-gray-400 hover:text-white transition">
              Home
            </a>
            <a
              href="/subscribe"
              className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]"
            >
              <Zap className="h-4 w-4" />
              Start Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-16 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(circle,rgba(16,185,129,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="mx-auto max-w-[1200px] px-6 pt-16 pb-10">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Sales Blitz
          </a>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-extrabold text-white tracking-tight md:text-4xl">
                  {TOOL_NAMES[demoRun.toolName] || demoRun.toolName}
                </h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Live Demo
                </span>
              </div>
              <p className="text-lg text-gray-400 max-w-lg">
                {TOOL_HOOKS[demoRun.toolName] || "See what a completed blitz looks like."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Target Context Card */}
      <div className="mx-auto max-w-[1200px] px-6 pb-6">
        <div className="rounded-2xl border border-[#262626] bg-[#141414] p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Users className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sample target</p>
                <p className="text-lg font-bold text-white">
                  {demoRun.targetName}
                  <span className="font-normal text-gray-400"> at </span>
                  {demoRun.targetCompany}
                </p>
                {demoRun.targetRole && (
                  <p className="text-sm text-gray-500">{demoRun.targetRole}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{demoRun.totalSteps}</p>
                <p className="text-xs text-gray-500">Research steps</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{demoRun.assets.length}</p>
                <p className="text-xs text-gray-500">Deliverables</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{totalDuration}</p>
                <p className="text-xs text-gray-500">Total time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column on Desktop */}
      <div className="mx-auto max-w-[1200px] px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: Execution Timeline */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[#262626] bg-[#141414] overflow-hidden">
              <div className="border-b border-[#262626] px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Execution Timeline</h2>
              </div>
              <div className="p-4">
                {demoRun.steps.map((step, i) => {
                  const StepIcon = STEP_ICONS[step.id] || FileText;
                  const isLast = i === demoRun.steps.length - 1;
                  return (
                    <div key={step.id} className="flex gap-3">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </div>
                        {!isLast && (
                          <div className="w-px flex-1 bg-[#262626] my-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className={`pb-5 ${isLast ? "" : ""}`}>
                        <div className="flex items-center gap-2">
                          <StepIcon className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-sm font-medium text-white">{step.label}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>
                        <span className="mt-1 inline-block text-[10px] text-gray-600 font-mono">
                          {formatDuration(step.startedAt, step.completedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Deliverables */}
          <div className="lg:col-span-3 space-y-6">
            {(["interactive", "research", "deliverable"] as const).map((category) => {
              const categoryAssets = demoRun.assets.filter((a) => a.category === category);
              if (categoryAssets.length === 0) return null;
              const meta = ASSET_CATEGORY_META[category];
              const CategoryIcon = meta.icon;

              return (
                <div key={category} className="rounded-2xl border border-[#262626] bg-[#141414] overflow-hidden">
                  <div className="border-b border-[#262626] px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{meta.description}</p>
                  </div>
                  <div className="divide-y divide-[#1e1e1e]">
                    {categoryAssets.map((asset) => {
                      const fmt = FORMAT_LABELS[asset.format] || { label: asset.format.toUpperCase(), color: "bg-gray-500/20 text-gray-400" };
                      return (
                        <div
                          key={asset.id}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-[#1a1a1a] transition group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 group-hover:text-white transition">
                              {asset.label}
                            </p>
                            {asset.size && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {Math.round(asset.size / 1024)}KB
                              </p>
                            )}
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${fmt.color}`}>
                            {fmt.label}
                          </span>
                          <span className="rounded-full bg-[#1e1e1e] border border-[#333] px-2.5 py-0.5 text-[10px] font-medium text-gray-500">
                            Demo
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What You Get Section */}
      <div className="border-t border-[#262626] bg-[#0f0f0f]">
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2 className="text-2xl font-extrabold text-white text-center mb-2">Everything in one blitz</h2>
          <p className="text-gray-400 text-center mb-10 max-w-lg mx-auto">
            Not five tools. Not ten tabs. One name, one blitz, everything you need to walk in prepared.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Search, title: "Deep Research", desc: "Company intel, financial data, competitive positioning, stakeholder mapping." },
              { icon: FileText, title: "On-Screen Notes", desc: "Phase-by-phase bullet guides for discovery, pitch, and close. Glance, don't read." },
              { icon: Mic, title: "AI Practice", desc: "Rehearse with AI personas built from your research. Scored on 8 dimensions." },
              { icon: BarChart3, title: "POV Deck", desc: "5-slide deck ready for Google Slides. Upload, polish with AI, share." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-[#262626] bg-[#141414] p-5 hover:border-emerald-500/30 transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <item.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-[#262626]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3 md:text-4xl">
            Ready to own your next conversation?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Two free blitzes included. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/subscribe"
              className="flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 text-base font-semibold text-black hover:bg-emerald-400 transition hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Other Demos */}
      {allDemos.filter((d) => d.toolName !== toolName).length > 0 && (
        <div className="border-t border-[#262626]">
          <div className="mx-auto max-w-[1200px] px-6 py-12">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              More sample runs
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allDemos
                .filter((d) => d.toolName !== toolName)
                .map((d) => (
                  <a
                    key={d.toolName}
                    href={`/demo/${d.toolName}`}
                    className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#141414] px-5 py-4 hover:border-emerald-500/30 hover:bg-[#1a1a1a] transition group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition">
                        {TOOL_NAMES[d.toolName] || d.toolName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {d.targetName} at {d.targetCompany}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-emerald-400 transition" />
                  </a>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#262626] py-8 text-center">
        <p className="text-xs text-gray-600">
          Sales Blitz &mdash; Strategic Sales Intelligence
        </p>
      </div>
    </div>
  );
}
