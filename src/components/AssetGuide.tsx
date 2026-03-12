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
        laptop: { label: "Laptop", content: "Video call (left) + Call Playbook (right)" },
        tip: "Keep your eyes on the camera. Glance down briefly for bullet reminders. Don't read.",
      };
    }
    if (mode === "presenting") {
      return {
        laptop: { label: "Laptop", content: "Presentation + speaker notes (split view)" },
        tip: "Speaker notes are bullet format. One talking point, one data point, one transition cue per slide.",
      };
    }
    return {
      laptop: { label: "Laptop", content: "Call Playbook (left) + Arsenal or Competitive Playbook (right)" },
      tip: "No video means you can reference freely. Use the full screen.",
    };
  }

  if (monitors === 2) {
    if (mode === "video") {
      return {
        laptop: { label: "Laptop", content: "Video call (left) + Call Playbook (right)" },
        external1: { label: "External", content: "Arsenal (emergency recovery lines only)" },
        tip: "Don't stare at the external screen. It's there if you get completely derailed.",
      };
    }
    if (mode === "presenting") {
      return {
        laptop: { label: "Laptop", content: "Presentation (shared) + speaker notes" },
        external1: { label: "External", content: "Video call + Call Playbook" },
        tip: "Your audience can see hesitation. Stay on your slides. External monitor is for between-slide glances.",
      };
    }
    return {
      laptop: { label: "Laptop", content: "Call Playbook (primary reference)" },
      external1: { label: "External", content: "Arsenal + Competitive Playbook side by side" },
      tip: "Phone calls and audio-only meetings let you use everything. Spread out.",
    };
  }

  // 3 monitors
  if (mode === "video") {
    return {
      laptop: { label: "Laptop", content: "Video call (left) + Call Playbook (right)" },
      external1: { label: "External 1", content: "Arsenal (emergency only)" },
      external2: { label: "External 2", content: "Competitive Playbook (emergency only)" },
      tip: "Two external screens are insurance. Your primary reference stays on the laptop next to the camera.",
    };
  }
  if (mode === "presenting") {
    return {
      laptop: { label: "Laptop", content: "Presentation + speaker notes" },
      external1: { label: "External 1", content: "Video call + Call Playbook" },
      external2: { label: "External 2", content: "Arsenal (emergency)" },
      tip: "Speaker notes on the laptop keep you looking at the camera. Side monitors are backup.",
    };
  }
  return {
    laptop: { label: "Laptop", content: "Call Playbook (primary reference)" },
    external1: { label: "External 1", content: "Arsenal" },
    external2: { label: "External 2", content: "Competitive Playbook + Stakeholder Map" },
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
          "Read the Research Brief cover to cover (10 min). This is your deep study material.",
          "Walk through the Competitive Playbook. Bookmark it for quick reference.",
          "Run a practice session to test your answers under pressure.",
          "Use the NotebookLM section below for podcast, flashcards, quiz, and slide deck prompts tailored to this prep.",
        ],
      },
      {
        icon: Eye,
        title: "During the call",
        items: [
          "Stay present. Ask good questions and listen. Your prep is the work; the call is the performance.",
          "Your documents are a safety net, not a script. Glance at bullet points if you need a reminder, but never read paragraphs.",
          "Call Playbook is your primary reference. Bullet format, designed for quick glances.",
          "Arsenal is emergency backup. Side monitor. Only if things go completely off-script.",
          "If presenting slides, speaker notes have your talking points per slide.",
        ],
      },
      {
        icon: Send,
        title: "For sending (not on-screen)",
        items: [
          "Handwritten cards are designed to mail or hand-deliver. They're a creative first impression, not a call reference.",
          "Outreach sequence is for copy-pasting into email and LinkedIn. Not for the interview itself.",
          "POV deck and Gamma deck are for sharing during presentations, not reading to yourself.",
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
          "Study the Research Brief. Know their pain points, competitive landscape, and key stakeholders.",
          "Review the Competitive Playbook. Understand how they're solving this today and why that falls short.",
          "Run a practice session to rehearse discovery questions and objection responses.",
          "Check the Stakeholder Map to know who influences the decision.",
        ],
      },
      {
        icon: Eye,
        title: "During the call",
        items: [
          "Stay present. Your #1 job is to listen and ask good questions. The prep is the work; the call is about connection.",
          "Documents are your safety net, not a teleprompter. A quick glance at a bullet point is fine; reading sentences is not.",
          "Call Playbook guides you phase by phase. Discovery questions are highlighted in amber.",
          "Listen-for signals are in green. When you hear one, that's a buying trigger.",
          "Arsenal has word-for-word recovery lines. Side monitor. Only when things go off-script.",
        ],
      },
      {
        icon: Send,
        title: "For sending (not on-screen)",
        items: [
          "Handwritten cards make a memorable first impression. Send before or after the meeting.",
          "Outreach sequence is pre-built. Copy-paste into your email or CRM.",
          "Gamma deck is shareable via link. Great for follow-up presentations.",
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
          "Research Brief gives you the full picture of the company and role.",
          "Competitive Playbook shows how to position yourself against other candidates.",
        ],
      },
      {
        icon: Send,
        title: "Send these",
        items: [
          "Outreach sequence has 7 pre-written touches. Customize the details, keep the structure.",
          "Handwritten cards are a standout move. Mail one before your outreach hits their inbox.",
          "POV deck can be attached to an email or shared in a follow-up.",
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
          "Research Brief is your ammunition. Know their pain before you write a word.",
          "Competitive Playbook shows what they're using today and why it falls short.",
        ],
      },
      {
        icon: Send,
        title: "Send these",
        items: [
          "Outreach sequence has 7 touches across email, LinkedIn, and phone. Each one is research-grounded.",
          "Handwritten cards cut through inbox noise. Mail one to arrive the same day as your first email.",
          "POV deck gives them something to forward internally.",
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
          "Deal Audit Report flags qualification gaps, risk areas, and recommended next moves.",
          "Use the Competitive Playbook to prepare for competitive objections.",
          "Stakeholder Map shows who you need to reach and their likely disposition.",
        ],
      },
      {
        icon: Send,
        title: "For internal use",
        items: [
          "Share the Deal Audit with your manager for deal review conversations.",
          "Handwritten cards can help re-engage stalled contacts with a personal touch.",
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
          "Champion Strategy Brief outlines the internal narrative your champion needs to deliver.",
          "Stakeholder Map shows the political landscape and who to target next.",
          "Competitive Playbook helps your champion counter competitive FUD internally.",
        ],
      },
      {
        icon: Send,
        title: "For your champion",
        items: [
          "Handwritten cards can be a personal touch to strengthen the relationship.",
          "Share relevant sections of the Competitive Playbook to arm them with talk tracks.",
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
        "Research materials are for studying before your meeting. Read them thoroughly.",
        "Interactive assets can be bookmarked for quick reference during calls.",
        "Deliverables are ready to download, print, or share.",
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
                  <span className="font-semibold">If they say no:</span> Turn it off immediately. No pushback. Use your Call Playbook and take manual notes.
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

          {/* Google Slides beautification guidance - shows for all tools that generate decks */}
          <div className="mt-3 rounded-lg border border-green-100 bg-green-500/10/50 p-4">
            <p className="text-xs font-semibold text-green-400 mb-2">Polish your deck in Google Slides</p>
            <p className="text-xs text-green-400 mb-2">
              Your PPTX is structured for Google Slides&apos; AI design tools. Upload to Google Drive, open with Slides, then use these features:
            </p>
            <ul className="space-y-1.5 ml-1">
              <li className="text-xs text-green-400">
                <span className="font-semibold">Beautify This Slide:</span> Click any slide, then click &quot;Beautify this slide&quot; in the toolbar. Gemini redesigns it with professional layout and colors. Click &quot;Insert as new slide&quot; to keep it.
              </li>
              <li className="text-xs text-green-400">
                <span className="font-semibold">Refine Text:</span> Click any text box, then click the pencil-sparkle icon. Choose Shorten, Rephrase, or More Formal, or type a custom prompt.
              </li>
              <li className="text-xs text-green-400">
                <span className="font-semibold">Add AI Visuals:</span> Insert &gt; Help me visualize. Describe what you need (e.g., &quot;competitive quadrant chart&quot; or &quot;market share breakdown&quot;).
              </li>
            </ul>
            <p className="text-xs text-green-600 mt-2 italic">
              Requires Google Workspace Business Standard/Plus/Enterprise or Google AI Pro/Ultra.
            </p>
          </div>

          {/* Handwritten card guidance */}
          {!isPrep && toolName.includes("outreach") && (
            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-500/10/50 p-3">
              <p className="text-xs text-amber-400">
                <span className="font-semibold">About the handwritten cards:</span> These are designed to send, not to reference during calls. Mail or hand-deliver them as a creative first touch. If the cards didn&apos;t generate the way you wanted, you can regenerate them in Google AI Studio using the prompt in your delivery email.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
