"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Monitor,
  Laptop,
  BookOpen,
  Send,
  Eye,
  Video,
  Presentation,
  Shield,
} from "lucide-react";

interface AssetGuideProps {
  toolName: string;
  meetingType?: string;
}

// ─── Screen Setup Recommendations ──────────────────────────────────────────

type MonitorCount = 1 | 2 | 3;
type CallMode = "video" | "no_video" | "presenting";

interface ScreenLayout {
  label: string;
  content: string;
}

interface SetupConfig {
  laptop: ScreenLayout;
  external1?: ScreenLayout;
  external2?: ScreenLayout;
  tip: string;
}

function getScreenSetup(monitors: MonitorCount, mode: CallMode): SetupConfig {
  if (monitors === 1) {
    if (mode === "video") {
      return {
        laptop: { label: "Laptop", content: "Video call (left) + Speaker Notes (right)" },
        tip: "Keep your eyes on the camera. Glance down briefly for bullet reminders. Don't read.",
      };
    }
    if (mode === "presenting") {
      return {
        laptop: { label: "Laptop", content: "POV Deck + speaker notes (split view)" },
        tip: "Speaker notes are bullet format. One talking point, one data point, one transition cue per slide.",
      };
    }
    return {
      laptop: { label: "Laptop", content: "Speaker Notes (left) + Context File (right)" },
      tip: "No video means you can reference freely. Use the full screen.",
    };
  }

  if (monitors === 2) {
    if (mode === "video") {
      return {
        laptop: { label: "Laptop", content: "Video call (left) + Speaker Notes (right)" },
        external1: { label: "External", content: "Context File (deep reference if needed)" },
        tip: "Speaker Notes are your primary glance material. External monitor is for deep-dive recovery.",
      };
    }
    if (mode === "presenting") {
      return {
        laptop: { label: "Laptop", content: "POV Deck (shared) + speaker notes" },
        external1: { label: "External", content: "Video call + Speaker Notes" },
        tip: "Your audience can see hesitation. Stay on your slides. External monitor is for between-slide glances.",
      };
    }
    return {
      laptop: { label: "Laptop", content: "Speaker Notes (primary reference)" },
      external1: { label: "External", content: "Context File (full research)" },
      tip: "Phone calls and audio-only meetings let you use everything. Spread out.",
    };
  }

  // 3 monitors
  if (mode === "video") {
    return {
      laptop: { label: "Laptop", content: "Video call (left) + Speaker Notes (right)" },
      external1: { label: "External 1", content: "Context File (deep reference)" },
      external2: { label: "External 2", content: "POV Deck or NotebookLM materials" },
      tip: "Two external screens are insurance. Your primary reference stays on the laptop next to the camera.",
    };
  }
  if (mode === "presenting") {
    return {
      laptop: { label: "Laptop", content: "POV Deck + speaker notes" },
      external1: { label: "External 1", content: "Video call + Speaker Notes" },
      external2: { label: "External 2", content: "Context File (emergency reference)" },
      tip: "Speaker notes on the laptop keep you looking at the camera. Side monitors are backup.",
    };
  }
  return {
    laptop: { label: "Laptop", content: "Speaker Notes (primary reference)" },
    external1: { label: "External 1", content: "Context File (full research)" },
    external2: { label: "External 2", content: "POV Deck or NotebookLM materials" },
    tip: "No camera means you can spread everything out. Use the space.",
  };
}

function ScreenSetupWidget() {
  const [monitors, setMonitors] = useState<MonitorCount>(1);
  const [mode, setMode] = useState<CallMode>("video");

  const setup = getScreenSetup(monitors, mode);

  return (
    <div className="mt-4 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a]/50 p-4">
      <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">Screen Setup</p>

      <div className="flex gap-4 mb-4">
        <div>
          <p className="text-xs text-neutral-400 mb-1.5">Monitors</p>
          <div className="flex gap-1">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                onClick={() => setMonitors(n)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${
                  monitors === n
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-[#141414] text-neutral-300 border-[#262626] hover:border-[#333333]"
                }`}
              >
                {n === 1 ? "Laptop only" : n === 2 ? "Laptop + 1" : "Laptop + 2"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-neutral-400 mb-1.5">Call type</p>
          <div className="flex gap-1">
            {([
              { key: "video" as const, label: "Video", Icon: Video },
              { key: "no_video" as const, label: "Audio only", Icon: Monitor },
              { key: "presenting" as const, label: "Presenting", Icon: Presentation },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition ${
                  mode === key
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-[#141414] text-neutral-300 border-[#262626] hover:border-[#333333]"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual layout */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Laptop className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">{setup.laptop.label}</span>
          </div>
          <p className="text-xs text-emerald-400">{setup.laptop.content}</p>
        </div>
        {setup.external1 && (
          <div className="flex-1 rounded-lg border border-[#262626] bg-[#141414] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Monitor className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-300">{setup.external1.label}</span>
            </div>
            <p className="text-xs text-neutral-300">{setup.external1.content}</p>
          </div>
        )}
        {setup.external2 && (
          <div className="flex-1 rounded-lg border border-[#262626] bg-[#141414] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Monitor className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-300">{setup.external2.label}</span>
            </div>
            <p className="text-xs text-neutral-300">{setup.external2.content}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-400 italic">{setup.tip}</p>
    </div>
  );
}

// ─── Asset Usage Guide Content ─────────────────────────────────────────────

interface GuideSection {
  icon: React.ElementType;
  title: string;
  items: string[];
}

function getGuideContent(toolName: string): GuideSection[] {
  const isInterview = toolName.includes("interview");
  const isOutreach = toolName.includes("outreach");
  const isPrep = toolName.includes("prep");
  const isDealAudit = toolName === "deal_audit";
  const isChampion = toolName === "champion_builder";

  if (isPrep && isInterview) {
    return [
      {
        icon: BookOpen,
        title: "Before the call",
        items: [
          "Read the Context File thoroughly (10 min). This is your deep research, formatted for studying and for uploading to NotebookLM.",
          "Review the Speaker Notes. These are your glanceable reference during the actual interview.",
          "Upload your POV Deck to Google Slides and polish it using the AI design tools below.",
          "Run a practice session to test your answers under pressure.",
          "Use the NotebookLM section for podcast, video, flashcards, quiz, and more study formats.",
        ],
      },
      {
        icon: Eye,
        title: "During the call",
        items: [
          "Stay present. Ask good questions and listen. Your prep is the work; the call is the performance.",
          "Speaker Notes are your primary reference. Bullet format, designed for quick glances between questions.",
          "Your documents are a safety net, not a script. Glance at bullet points if you need a reminder, but never read paragraphs.",
          "If presenting your POV Deck, speaker notes have your talking points per slide.",
        ],
      },
      {
        icon: Send,
        title: "For sending",
        items: [
          "POV Deck can be shared as a follow-up or during a presentation portion of the interview.",
          "Context File can be re-uploaded to NotebookLM to generate additional study materials any time.",
        ],
      },
    ];
  }

  if (isPrep && !isInterview) {
    return [
      {
        icon: BookOpen,
        title: "Before the call",
        items: [
          "Study the Context File. Know their pain points, competitive landscape, and key stakeholders.",
          "Review the Speaker Notes. These are your in-call reference with discovery questions and positioning.",
          "Upload your POV Deck to Google Slides and polish it using the AI design tools below.",
          "Run a practice session to rehearse discovery questions and objection responses.",
        ],
      },
      {
        icon: Eye,
        title: "During the call",
        items: [
          "Stay present. Your #1 job is to listen and ask good questions. The prep is the work; the call is about connection.",
          "Speaker Notes guide you phase by phase. Discovery questions, listen-for signals, and recovery lines are all in there.",
          "Documents are your safety net, not a teleprompter. A quick glance at a bullet point is fine; reading sentences is not.",
          "If presenting your POV Deck, speaker notes have your talking points per slide.",
        ],
      },
      {
        icon: Send,
        title: "For sending",
        items: [
          "POV Deck is designed to be shared as a follow-up. Upload to Google Slides, polish it, then share the link.",
          "Context File can be re-uploaded to NotebookLM any time you want to generate fresh study materials.",
        ],
      },
    ];
  }

  if (isOutreach && isInterview) {
    return [
      {
        icon: BookOpen,
        title: "Study these",
        items: [
          "Context File gives you the full picture of the company, role, and competitive landscape.",
          "Use this research to personalize every touch in your outreach sequence.",
        ],
      },
      {
        icon: Send,
        title: "Send these",
        items: [
          "Outreach Sequences have pre-written multi-touch campaigns. Customize the details, keep the structure.",
          "Each touch is research-grounded with specific references to the company and role.",
          "Copy-paste into your email client or LinkedIn. Adjust timing to your cadence.",
        ],
      },
    ];
  }

  if (isOutreach && !isInterview) {
    return [
      {
        icon: BookOpen,
        title: "Study these",
        items: [
          "Context File is your foundation. Know their situation before you write a word.",
          "The research covers competitive landscape, trigger events, and stakeholder context.",
        ],
      },
      {
        icon: Send,
        title: "Send these",
        items: [
          "Outreach Sequences have multi-touch campaigns across email, LinkedIn, and phone. Each touch is research-grounded.",
          "Copy-paste into your email client or CRM. Personalize the opening line, keep the structure.",
          "POV Deck gives them something to forward internally. Upload to Google Slides and polish before sharing.",
        ],
      },
    ];
  }

  if (isDealAudit) {
    return [
      {
        icon: BookOpen,
        title: "Review and act on",
        items: [
          "Context File has the full deal analysis: qualification gaps, risk areas, and competitive dynamics.",
          "Speaker Notes distill the key actions and talking points for your next conversation.",
        ],
      },
      {
        icon: Send,
        title: "For internal use",
        items: [
          "Share the Context File with your manager for deal review conversations.",
          "Upload to NotebookLM to generate a deal review deck or coaching podcast.",
        ],
      },
    ];
  }

  if (isChampion) {
    return [
      {
        icon: BookOpen,
        title: "Strategy materials",
        items: [
          "Context File outlines the internal narrative your champion needs to deliver, stakeholder dynamics, and competitive positioning.",
          "Speaker Notes give you the coaching talking points for your next champion conversation.",
        ],
      },
      {
        icon: Send,
        title: "For your champion",
        items: [
          "Share relevant sections of the Context File to equip them with internal talking points.",
          "Upload to NotebookLM to generate a champion enablement deck they can use in internal meetings.",
        ],
      },
    ];
  }

  // Fallback
  return [
    {
      icon: BookOpen,
      title: "How to use your deliverables",
      items: [
        "Context File is your deep research. Study it before meetings, upload it to NotebookLM for additional formats.",
        "Speaker Notes are your in-meeting reference. Glanceable, not readable.",
        "Deliverables are ready to download, share, or upload to other tools.",
      ],
    },
  ];
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AssetGuide({ toolName, meetingType }: AssetGuideProps) {
  const [expanded, setExpanded] = useState(true);
  const sections = getGuideContent(toolName);
  const isPrep = toolName.includes("prep");

  return (
    <div className="rounded-xl border bg-[#141414] shadow-sm shadow-black/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#0a0a0a] transition"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          <h2 className="font-semibold text-white text-left">How to use your deliverables</h2>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-500" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-5">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <div key={i}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-neutral-100">{section.title}</h3>
                </div>
                <ul className="space-y-1.5 ml-6">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-sm text-neutral-300 leading-relaxed">
                      <span className="text-emerald-400 mr-2">&#8250;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Screen setup widget for prep tools */}
          {isPrep && <ScreenSetupWidget />}

          {/* Recording disclosure coaching - shows for prep tools (anything with a live call) */}
          {isPrep && (
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-500/10/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <p className="text-xs font-semibold text-blue-400">Recording &amp; note-taking etiquette</p>
              </div>
              <p className="text-xs text-blue-400 mb-2">
                If you are using any recording or note-taking tool (our extension, Otter, Fathom, etc.), always disclose it at the start of the call. Even in one-party consent states, transparency builds trust.
              </p>
              <div className="rounded-md bg-blue-500/15/60 p-3 mb-2">
                <p className="text-xs text-blue-400 italic">
                  &quot;Hey, before we get started, this conversation is really important to me so I have an AI note-taker running. It just helps me stay present and focused on what you are saying instead of scribbling notes. Totally fine?&quot;
                </p>
              </div>
              <ul className="space-y-1 ml-1">
                <li className="text-xs text-blue-400">
                  <span className="font-semibold">If they say no:</span> Turn it off immediately. No pushback. Use your Speaker Notes and take manual notes.
                </li>
                <li className="text-xs text-blue-400">
                  <span className="font-semibold">If others have bots:</span> Their recording is separate from yours. You still need to disclose your own, and they should disclose theirs.
                </li>
                <li className="text-xs text-blue-400">
                  <span className="font-semibold">11 US states require all-party consent:</span> CA, CT, FL, IL, MD, MA, MI, MT, NH, PA, WA. If any participant is in one of these states, you must get consent.
                </li>
              </ul>
            </div>
          )}

          {/* Google Slides AI design guidance - shows for all tools that generate decks */}
          <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-xs font-semibold text-green-400 mb-2">Polish your deck in Google Slides (2 steps)</p>
            <p className="text-xs text-green-400/80 mb-3">
              Your PPTX has the right content and structure. Google Slides&apos; AI tools add the visual polish. Upload to Google Drive, open with Slides, then do these two steps on each slide:
            </p>
            <div className="space-y-3">
              <div className="rounded-md bg-[#0a0a0a] border border-green-500/10 px-3 py-2.5">
                <p className="text-xs text-green-400 font-semibold mb-1">
                  Step 1: Restructure the layout with Gemini
                </p>
                <p className="text-xs text-green-400/70">
                  Click <span className="text-green-300">&quot;Enhance this slide&quot;</span> at the bottom of any slide. When the Gemini prompt appears, paste this:
                </p>
                <p className="text-xs text-green-300 mt-1.5 bg-green-500/10 rounded px-2 py-1.5 font-mono leading-relaxed">
                  Edit this slide to most effectively communicate the core message. Improve the design, prefer well structured visual layouts, retain the key content but make it more concise as needed.
                </p>
                <p className="text-xs text-green-400/50 mt-1.5 italic">
                  This gets Gemini to restructure the layout while keeping your content. Choose Insert to compare with the original, or Replace.
                </p>
              </div>
              <div className="rounded-md bg-[#0a0a0a] border border-green-500/10 px-3 py-2.5">
                <p className="text-xs text-green-400 font-semibold mb-1">
                  Step 2: Add visuals with Help Me Visualize
                </p>
                <p className="text-xs text-green-400/70">
                  Click the <span className="text-green-300">wand/banana button</span> on the same slide to open &quot;Help me visualize.&quot; Type <span className="text-green-300">&quot;beautify this slide&quot;</span> followed by anything specific you want to highlight (e.g. &quot;beautify this slide. highlight the ROI numbers and make the pricing table stand out&quot;).
                </p>
                <p className="text-xs text-green-400/50 mt-1 italic">
                  This adds visual polish on top of the restructured layout. Do Step 1 first, then Step 2.
                </p>
              </div>
            </div>
            <p className="text-xs text-green-400/60 mt-3">
              <span className="font-semibold text-green-400/80">Requires Google One AI Premium ($20/mo).</span>{" "}
              Same subscription that powers NotebookLM Studio. Unlocks Gemini across Slides, Docs, and Gmail.
              Best $20 a sales rep can spend.
            </p>
          </div>

          {/* Outreach tip */}
          {!isPrep && toolName.includes("outreach") && (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-400">
                <span className="font-semibold">Outreach sequences are copy-paste ready.</span> Each touch is research-grounded with specific references to the target company. Personalize the opening line for your voice, but the structure and data points are ready to go. Paste into your email client, CRM, or LinkedIn.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
