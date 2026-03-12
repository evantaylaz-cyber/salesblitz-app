"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Headphones,
  Layers,
  HelpCircle,
  Upload,
  Search,
  Copy,
  Check,
  ExternalLink,
  Lightbulb,
  BookOpen,
  Presentation,
} from "lucide-react";

interface NotebookLMGuideProps {
  toolName: string;
  targetCompany: string;
  targetName: string;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PromptConfig {
  label: string;
  icon: React.ElementType;
  /** Matches the exact NotebookLM UI: feature name > settings to select */
  settingsHint: string;
  prompt: string;
}

interface SourceRecommendation {
  label: string;
  description: string;
}

interface DeepResearchSuggestion {
  query: string;
  why: string;
}

// ─── Prompt generators (short prompts, let NLM do its thing) ────────────────

function getPrompts(
  toolName: string,
  company: string,
  contact: string
): PromptConfig[] {
  const isInterview = toolName.includes("interview");
  const isPrep = toolName.includes("prep");
  const isDealAudit = toolName === "deal_audit";
  const isChampion = toolName === "champion_builder";

  const prompts: PromptConfig[] = [];

  // ── Podcast (Audio Overview) ──
  if (isInterview && isPrep) {
    prompts.push({
      label: "Podcast",
      icon: Headphones,
      settingsHint: "Audio Overview > Deep Dive > Default length",
      prompt: `Brief me on ${company}'s business, competitive position, and what makes this role strategic. Cover it like a teammate prepping me for an interview, not a textbook.`,
    });
  } else if (!isInterview && isPrep) {
    prompts.push({
      label: "Podcast",
      icon: Headphones,
      settingsHint: "Audio Overview > Deep Dive > Default length",
      prompt: `Brief me on ${company}'s pain points, buying triggers, and competitive alternatives. Frame it like a pre-call huddle with a teammate who knows this account.`,
    });
  } else if (isDealAudit) {
    prompts.push({
      label: "Podcast",
      icon: Headphones,
      settingsHint: "Audio Overview > Deep Dive > Default length",
      prompt: `Walk through the deal risks, qualification gaps, and what needs to happen next. Make it a coaching conversation, not a data dump.`,
    });
  } else if (isChampion) {
    prompts.push({
      label: "Podcast",
      icon: Headphones,
      settingsHint: "Audio Overview > Deep Dive > Default length",
      prompt: `Cover who our champion is, what they care about, and how to arm them to sell internally. Focus on the political landscape and the narrative they need to deliver.`,
    });
  } else {
    // Outreach tools
    prompts.push({
      label: "Podcast",
      icon: Headphones,
      settingsHint: "Audio Overview > Brief > Short",
      prompt: `Summarize ${company}'s pain signals, trigger events, and what would make ${contact} respond to cold outreach.`,
    });
  }

  // ── Slide Deck ──
  if (isInterview && isPrep) {
    prompts.push({
      label: "Slide Deck",
      icon: Presentation,
      settingsHint: "Slide Deck > Presenter Slides > Default length",
      prompt: `Create a visual study guide covering ${company}'s business, competitive landscape, and my preparation strategy for this interview. Structure it as a final review I can flip through 30 minutes before the call.`,
    });
  } else if (!isInterview && isPrep) {
    prompts.push({
      label: "Slide Deck",
      icon: Presentation,
      settingsHint: "Slide Deck > Presenter Slides > Default length",
      prompt: `Create a pre-call briefing deck for ${company}. Cover their pain points, competitive alternatives, discovery questions to ask, and our positioning. Structure it as a reference I can glance at during the call.`,
    });
  } else if (isDealAudit) {
    prompts.push({
      label: "Slide Deck",
      icon: Presentation,
      settingsHint: "Slide Deck > Detailed Deck > Default length",
      prompt: `Create a deal review deck covering qualification status, risk areas, stakeholder alignment, and recommended next steps. Structure it for an internal deal review.`,
    });
  } else if (isChampion) {
    prompts.push({
      label: "Slide Deck",
      icon: Presentation,
      settingsHint: "Slide Deck > Detailed Deck > Default length",
      prompt: `Create a champion enablement deck covering the internal narrative, stakeholder map, and the business case our champion needs to present at ${company}.`,
    });
  }

  // ── Flashcards (high value for prep tools only) ──
  if (isInterview && isPrep) {
    prompts.push({
      label: "Flashcards",
      icon: Layers,
      settingsHint: "Flashcards > More cards > Hard",
      prompt: `Focus on ${company}'s key metrics, leadership, competitive position, and role-specific knowledge. Card fronts should be short (1-5 words) for quick recall.`,
    });
  } else if (!isInterview && isPrep) {
    prompts.push({
      label: "Flashcards",
      icon: Layers,
      settingsHint: "Flashcards > More cards > Hard",
      prompt: `Focus on ${company}'s pain points, key stakeholders, competitive alternatives, and objection handling. Card fronts should be short for mid-call recall.`,
    });
  }

  // ── Quiz (high value for prep tools only) ──
  if (isInterview && isPrep) {
    prompts.push({
      label: "Quiz",
      icon: HelpCircle,
      settingsHint: "Quiz > More questions > Hard",
      prompt: `Test me on ${company}'s business model, financials, competitive landscape, and role requirements. Include scenario questions like "If asked about ${company}'s biggest risk, how do you respond?"`,
    });
  } else if (!isInterview && isPrep) {
    prompts.push({
      label: "Quiz",
      icon: HelpCircle,
      settingsHint: "Quiz > More questions > Hard",
      prompt: `Test me on ${company}'s pain points, buying triggers, and discovery strategy. Include scenario questions like "If ${contact} says they're happy with their current solution, what do you ask next?"`,
    });
  }

  return prompts;
}

// ─── Source material recommendations ────────────────────────────────────────

function getAssetsToUpload(toolName: string): string[] {
  const map: Record<string, string[]> = {
    interview_prep: [
      "Research Brief (PDF)",
      "POV Deck (PDF)",
      "Call Prep Sheet (PDF)",
      "Competitive Playbook (save as PDF)",
    ],
    interview_outreach: [
      "Research Brief (PDF)",
      "POV Deck (PDF)",
      "Call Prep Sheet (PDF)",
    ],
    prospect_prep: [
      "Research Brief (PDF)",
      "POV Deck (PDF)",
      "Call Prep Sheet (PDF)",
      "Competitive Playbook (save as PDF)",
    ],
    prospect_outreach: ["Research Brief (PDF)", "Call Prep Sheet (PDF)"],
    deal_audit: ["Deal Audit Report (PDF)", "Call Prep Sheet (PDF)"],
    champion_builder: [
      "Champion Strategy Brief (PDF)",
      "Call Prep Sheet (PDF)",
    ],
  };
  return map[toolName] || ["Research Brief (PDF)"];
}

function getAdditionalSources(
  toolName: string,
  company: string
): SourceRecommendation[] {
  const isInterview = toolName.includes("interview");
  const isPrep = toolName.includes("prep");
  const isDealAudit = toolName === "deal_audit";
  const isChampion = toolName === "champion_builder";

  if (isInterview && isPrep) {
    return [
      {
        label: `${company}'s latest earnings call or shareholder letter`,
        description: "CEO language reveals real priorities. Interviewers expect you to know this.",
      },
      {
        label: `${company}'s product pages or case studies for your target team`,
        description: "Knowing how they sell their product gives you language to use in the interview.",
      },
      {
        label: "LinkedIn profiles of your interviewers",
        description: "NotebookLM can surface talking points that connect your background to theirs.",
      },
      {
        label: `Recent ${company} press releases or blog posts`,
        description: "Shows you did homework beyond the job description.",
      },
    ];
  }

  if (!isInterview && isPrep) {
    return [
      {
        label: `${company}'s case studies or customer stories`,
        description: "Shows what outcomes they value. Mirror this language in discovery.",
      },
      {
        label: `${company}'s product/pricing pages`,
        description: "Frame your value in their terms, not yours.",
      },
      {
        label: `Competitor comparison pages that position against ${company}`,
        description: "Competitors often articulate pain points better than the company itself.",
      },
      {
        label: `${company}'s recent news or press releases`,
        description: "Trigger events are buying signals. Fresh news makes you timely.",
      },
    ];
  }

  if (isDealAudit) {
    return [
      {
        label: "Your deal notes, CRM activity history, or email threads",
        description: "The more context about where this deal stands, the sharper the audit.",
      },
      {
        label: `${company}'s latest investor materials or annual report`,
        description: "Budget cycles, strategic priorities, and risk tolerance.",
      },
    ];
  }

  if (isChampion) {
    return [
      {
        label: `${company}'s org chart or team page`,
        description: "Decision-making structure before coaching your champion.",
      },
      {
        label: "Your champion's recent LinkedIn posts",
        description: "Their public voice reveals what they care about.",
      },
    ];
  }

  // Outreach
  return [
    {
      label: `${company}'s product pages and pricing`,
      description: "Shows you did your homework in the first touch.",
    },
    {
      label: `${company}'s recent news or press releases`,
      description: "Timely references in outreach dramatically improve response rates.",
    },
  ];
}

function getDeepResearchSuggestions(
  toolName: string,
  company: string
): DeepResearchSuggestion[] {
  const isInterview = toolName.includes("interview");
  const isPrep = toolName.includes("prep");

  if (isInterview && isPrep) {
    return [
      {
        query: `${company} strategy challenges competitive landscape`,
        why: "Analyst commentary and strategic context beyond their website.",
      },
      {
        query: `${company} employee reviews culture team`,
        why: "Team dynamics and what the company actually values day-to-day.",
      },
      {
        query: `${company} recent acquisitions partnerships launches`,
        why: "Where they're investing. Interviewers love candidates who connect dots to strategy.",
      },
    ];
  }

  if (!isInterview && isPrep) {
    return [
      {
        query: `${company} pain points challenges problems`,
        why: "Real customer complaints and friction you can reference in discovery.",
      },
      {
        query: `${company} competitors alternatives market share`,
        why: "Full competitive field so you can position against the status quo.",
      },
      {
        query: `${company} technology investments digital transformation`,
        why: "Budget signals and appetite for change.",
      },
    ];
  }

  return [
    {
      query: `${company} business strategy challenges`,
      why: "Broad context that enriches everything else in your notebook.",
    },
  ];
}

// ─── Copy button ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function NotebookLMGuide({
  toolName,
  targetCompany,
  targetName,
}: NotebookLMGuideProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const company = targetCompany || "the target company";
  const contact = targetName || "your contact";

  const prompts = getPrompts(toolName, company, contact);
  const assetsToUpload = getAssetsToUpload(toolName);
  const additionalSources = getAdditionalSources(toolName, company);
  const deepResearchSuggestions = getDeepResearchSuggestions(toolName, company);

  if (prompts.length === 0) return null;

  const activePrompt = prompts[activeTab];
  const isPrep = toolName.includes("prep");
  const featureCount = prompts.length;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-[#141414] shadow-sm shadow-black/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#1a1a1a] transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
            <BookOpen className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-white text-sm">
              Study with NotebookLM
            </h2>
            <p className="text-xs text-neutral-500">
              {featureCount} ready-to-paste prompts for your {company} prep
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://notebooklm.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition px-2.5 py-1 rounded-md border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5"
          >
            Open NotebookLM
            <ExternalLink className="h-3 w-3" />
          </a>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#1a1a1a] px-6 py-5 space-y-5">
          {/* Step 1: Upload blitz assets */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-3.5 w-3.5 text-amber-400" />
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Step 1: Upload your blitz assets as sources
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mb-2">
              Download these from your deliverables below, then add them as sources in a new NotebookLM notebook.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {assetsToUpload.map((asset, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-md bg-[#1a1a1a] border border-[#262626] px-2.5 py-1 text-xs text-neutral-300"
                >
                  {asset}
                </span>
              ))}
            </div>
          </div>

          {/* Step 2: Add more source material */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Step 2: Supercharge it with more sources
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mb-2">
              The more relevant sources you add, the smarter your study materials get. High-value additions for this prep:
            </p>
            <div className="space-y-2">
              {additionalSources.map((source, i) => (
                <div
                  key={i}
                  className="flex gap-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2"
                >
                  <span className="text-amber-400 text-xs mt-0.5 shrink-0">+</span>
                  <div>
                    <p className="text-xs text-neutral-200 font-medium">{source.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{source.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deep Research tip */}
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-3.5 w-3.5 text-amber-400" />
              <h3 className="text-xs font-semibold text-amber-400">
                Use NotebookLM&apos;s built-in research to find sources
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mb-2">
              In your notebook, click <span className="text-neutral-200 font-medium">Add sources</span>, then choose <span className="text-neutral-200 font-medium">Web</span> or <span className="text-neutral-200 font-medium">Deep Research</span>. NotebookLM will search the web and add the results as a source. Try these queries:
            </p>
            <div className="space-y-2">
              {deepResearchSuggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-2 rounded-md bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-200 font-mono">{suggestion.query}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{suggestion.why}</p>
                  </div>
                  <CopyButton text={suggestion.query} />
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Generate study materials */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="h-3.5 w-3.5 text-amber-400" />
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Step 3: Generate study materials
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              Open the <span className="text-neutral-200 font-medium">Studio</span> panel in NotebookLM. Select a feature, paste the prompt, and hit Generate.
            </p>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-3">
              {prompts.map((p, i) => {
                const Icon = p.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition ${
                      activeTab === i
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-[#1a1a1a] text-neutral-300 border-[#262626] hover:border-[#333]"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Active prompt */}
            <div className="rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-neutral-500">
                  <span className="text-neutral-300 font-medium">{activePrompt.settingsHint}</span>
                </p>
                <CopyButton text={activePrompt.prompt} />
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed font-mono bg-[#111] rounded-md p-3 border border-[#1a1a1a]">
                {activePrompt.prompt}
              </p>
            </div>
          </div>

          {/* Why this works */}
          {isPrep && (
            <div className="rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-3">
              <p className="text-xs text-neutral-500 leading-relaxed">
                <span className="text-neutral-300 font-medium">Why this combo works:</span>{" "}
                {toolName.includes("interview")
                  ? "The podcast is passive study you can listen to on a walk. The slide deck gives you a visual review to flip through before the call. Flashcards drill the facts you need to recall mid-conversation. The quiz tests whether you actually internalized it or just skimmed."
                  : "The podcast gives you a conversational overview you can absorb anywhere. The slide deck is a visual reference during the call. Flashcards lock in names, numbers, and pain points. The quiz exposes gaps before the real conversation does."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
