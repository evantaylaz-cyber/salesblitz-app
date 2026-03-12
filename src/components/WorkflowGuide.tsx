"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Headphones,
  Mic,
  Send,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

interface WorkflowGuideProps {
  toolName: string;
  targetCompany: string;
  requestId: string;
}

interface WorkflowStep {
  icon: React.ElementType;
  title: string;
  description: string;
  timeEstimate: string;
  action?: {
    label: string;
    href: string;
  };
}

function getWorkflowSteps(toolName: string, targetCompany: string, requestId: string): WorkflowStep[] {
  const isInterview = toolName.includes("interview");
  const isOutreach = toolName.includes("outreach");
  const isPrep = toolName.includes("prep");
  const isDealAudit = toolName === "deal_audit";
  const isChampion = toolName === "champion_builder";

  if (isPrep && isInterview) {
    return [
      {
        icon: BookOpen,
        title: "Read the Context File",
        description: `Deep company intelligence on ${targetCompany}. Read cover to cover, not skim. This is your foundation for every answer.`,
        timeEstimate: "10 min",
      },
      {
        icon: FileText,
        title: "Review On-Screen Notes",
        description: "Your glanceable in-call reference. Discovery angles, talking points, and recovery lines structured for quick scanning.",
        timeEstimate: "5 min",
      },
      {
        icon: Headphones,
        title: "Study with NotebookLM",
        description: "Expand the NotebookLM section below for ready-to-paste prompts: podcast, video, slide deck, reports, flashcards, quiz, and more.",
        timeEstimate: "5 min setup",
      },
      {
        icon: Mic,
        title: "Practice against the AI interviewer",
        description: "Run 2-3 sessions. The persona is built from your research, so they push back with real objections. Review your scorecard between sessions.",
        timeEstimate: "15 min/session",
        action: {
          label: "Start Practice",
          href: `/practice?autostart=true&runRequestId=${requestId}&company=${encodeURIComponent(targetCompany)}&meetingType=hiring_manager`,
        },
      },
      {
        icon: Clock,
        title: "Polish your POV Deck",
        description: "Upload to Google Slides, use the AI design tools to add visuals and polish. See the Google Slides section below.",
        timeEstimate: "5 min",
      },
      {
        icon: Send,
        title: "After: come back and debrief",
        description: "Log what landed, what didn't, and what they asked that surprised you. This feeds your next run on this company.",
        timeEstimate: "3 min",
      },
    ];
  }

  if (isPrep && !isInterview) {
    return [
      {
        icon: BookOpen,
        title: "Read the Context File",
        description: `Their pain points, competitive landscape, and key stakeholders at ${targetCompany}. This is your pre-call study session.`,
        timeEstimate: "5 min",
      },
      {
        icon: FileText,
        title: "Review On-Screen Notes",
        description: "Your in-call reference with discovery questions, listen-for signals, and positioning angles. Structured for quick glances.",
        timeEstimate: "5 min",
      },
      {
        icon: Headphones,
        title: "Study with NotebookLM",
        description: "Expand the NotebookLM section below for ready-to-paste prompts: podcast, video, slide deck, reports, flashcards, quiz, and more.",
        timeEstimate: "5 min setup",
      },
      {
        icon: Mic,
        title: "Practice against the AI persona",
        description: "Rehearse your discovery questions and objection responses. Scored on messaging dimensions.",
        timeEstimate: "10 min",
        action: {
          label: "Start Practice",
          href: `/practice?autostart=true&runRequestId=${requestId}&company=${encodeURIComponent(targetCompany)}&meetingType=discovery`,
        },
      },
      {
        icon: Clock,
        title: "Polish your POV Deck",
        description: "Upload to Google Slides, use the AI design tools to add visuals. See the Google Slides section below.",
        timeEstimate: "5 min",
      },
      {
        icon: Send,
        title: "After: debrief",
        description: "Log the outcome, what resonated, and next steps. Your next blitz on this account will be smarter.",
        timeEstimate: "3 min",
      },
    ];
  }

  if (isOutreach) {
    return [
      {
        icon: BookOpen,
        title: "Read the Context File",
        description: `Understand ${targetCompany}'s pain points and priorities before you send anything.`,
        timeEstimate: "5 min",
      },
      {
        icon: FileText,
        title: "Review the Outreach Sequences",
        description: "Multi-touch campaigns across email, LinkedIn, and phone. Customize the opening, keep the structure.",
        timeEstimate: "5 min",
      },
      {
        icon: Send,
        title: "Send touch 1",
        description: "Copy-paste into your email or CRM. The first touch references their specific pain, not generic value props.",
        timeEstimate: "2 min",
      },
      {
        icon: Clock,
        title: "Follow the cadence",
        description: "Touches are spaced 2-3 days apart. Don't compress the sequence; the spacing is intentional.",
        timeEstimate: "Ongoing",
      },
    ];
  }

  if (isDealAudit) {
    return [
      {
        icon: BookOpen,
        title: "Read the Context File",
        description: "Full deal analysis with qualification gaps, risk areas, and competitive dynamics. Face the gaps honestly.",
        timeEstimate: "10 min",
      },
      {
        icon: FileText,
        title: "Review On-Screen Notes",
        description: "Key actions and talking points for your next conversation. Each flag has a recommended action.",
        timeEstimate: "5 min",
      },
      {
        icon: Send,
        title: "Share with your manager",
        description: "Use the context file as a deal review artifact. Walk through risks and your plan to close each gap.",
        timeEstimate: "5 min",
      },
    ];
  }

  if (isChampion) {
    return [
      {
        icon: BookOpen,
        title: "Read the Context File",
        description: "Understand the org chart, decision dynamics, and how to arm your internal advocate.",
        timeEstimate: "10 min",
      },
      {
        icon: FileText,
        title: "Review On-Screen Notes",
        description: "Coaching talking points for your next champion conversation. The narrative they need to deliver internally.",
        timeEstimate: "5 min",
      },
      {
        icon: Send,
        title: "Send materials to your champion",
        description: "Share relevant sections of the context file. Upload to NotebookLM to generate a champion enablement deck.",
        timeEstimate: "5 min",
      },
    ];
  }

  // Fallback for any other tool
  return [
    {
      icon: BookOpen,
      title: "Review your deliverables",
      description: "Start with the Context File, then review the On-Screen Notes for your specific scenario.",
      timeEstimate: "10 min",
    },
    {
      icon: Mic,
      title: "Practice if available",
      description: "Run a practice session to test your preparation under pressure.",
      timeEstimate: "15 min",
    },
    {
      icon: Send,
      title: "Debrief after",
      description: "Log what worked and what didn't. This context feeds your next run.",
      timeEstimate: "3 min",
    },
  ];
}

export default function WorkflowGuide({ toolName, targetCompany, requestId }: WorkflowGuideProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps = getWorkflowSteps(toolName, targetCompany, requestId);

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const completedCount = completedSteps.size;
  const totalCount = steps.length;

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-[#141414] shadow-sm shadow-black/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#1a1a1a] transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-white text-sm">What to do next</h2>
            <p className="text-xs text-neutral-500">
              {completedCount === 0
                ? "Your step-by-step game plan"
                : `${completedCount}/${totalCount} steps complete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-24 rounded-full bg-[#262626] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-neutral-500">{Math.round((completedCount / totalCount) * 100)}%</span>
            </div>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-[#1a1a1a] px-6 py-4">
          <div className="space-y-1">
            {steps.map((step, i) => {
              const isCompleted = completedSteps.has(i);
              const Icon = step.icon;

              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-lg px-3 py-3 transition ${
                    isCompleted ? "opacity-50" : "hover:bg-[#0a0a0a]"
                  }`}
                >
                  {/* Step checkbox */}
                  <button
                    onClick={() => toggleStep(i)}
                    className="mt-0.5 shrink-0"
                    aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-[#333] hover:border-emerald-500/50 transition" />
                    )}
                  </button>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className={`text-sm font-medium ${isCompleted ? "line-through text-neutral-500" : "text-neutral-200"}`}>
                        {step.title}
                      </span>
                      <span className="text-xs text-neutral-600 shrink-0">{step.timeEstimate}</span>
                    </div>
                    <p className={`text-xs mt-1 ml-5.5 leading-relaxed ${isCompleted ? "text-neutral-600" : "text-neutral-400"}`}>
                      {step.description}
                    </p>
                    {step.action && !isCompleted && (
                      <a
                        href={step.action.href}
                        target={step.action.href.startsWith("http") ? "_blank" : undefined}
                        rel={step.action.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-1 mt-2 ml-5.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
                      >
                        {step.action.label} &rarr;
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
