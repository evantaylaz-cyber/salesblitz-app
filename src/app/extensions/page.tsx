"use client";

import { useState } from "react";
import {
  Download,
  Check,
  Zap,
  Chrome,
  Mic,
  Brain,
  Target,
  BarChart3,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AppNav from "@/components/AppNav";

export default function ExtensionsPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const steps = [
    {
      number: 1,
      title: "Install the extension",
      description: "Download from Chrome Web Store. Works on Google Meet, Zoom web, and Microsoft Teams web.",
    },
    {
      number: 2,
      title: "Pin it to your toolbar",
      description:
        "Click the puzzle piece icon in your browser, find Sales Blitz, and click the pin to keep it visible.",
    },
    {
      number: 3,
      title: "Sign in",
      description:
        "The extension opens automatically. Sign in with your Sales Blitz account to sync.",
    },
    {
      number: 4,
      title: "Join a meeting",
      description:
        "Start any call on Google Meet, Zoom web, or Microsoft Teams web.",
    },
    {
      number: 5,
      title: "Click Record This Tab",
      description:
        "When ready, click the Record button in the extension. Audio captures from your browser tab only.",
    },
    {
      number: 6,
      title: "No bot joins. No one knows.",
      description:
        "Tab audio capture is invisible. No notification, no bot in the room, no recordings sent to others.",
    },
    {
      number: 7,
      title: "Click Stop when done",
      description:
        "Transcript and analysis appear in your dashboard within seconds. Ready to reference, share, or feed into your next blitz.",
    },
  ];

  const features = [
    {
      icon: Mic,
      title: "AI transcript with speaker detection",
      description: "Every word captured, speakers identified.",
    },
    {
      icon: Brain,
      title: "Meeting analysis",
      description:
        "Key moments, objections, commitments, and next steps extracted automatically.",
    },
    {
      icon: BarChart3,
      title: "Coaching feedback",
      description:
        "Discovery quality, objection handling, rapport, closing assessed on 8 dimensions with detailed scoring (0-5).",
    },
    {
      icon: Target,
      title: "Outcome assessment",
      description:
        "Clear verdict on meeting success with specific gaps to close before the next call.",
    },
    {
      icon: Zap,
      title: "Context for your next blitz",
      description:
        "All intel feeds into your next blitz for the same target. No context waste.",
    },
  ];

  const platforms = [
    {
      name: "Google Meet",
      status: "Full support",
      icon: Chrome,
    },
    {
      name: "Zoom (web client)",
      status: "Full support",
      icon: Chrome,
    },
    {
      name: "Microsoft Teams (web client)",
      status: "Full support",
      icon: Chrome,
    },
  ];

  const faqs = [
    {
      question: "Can others see I'm recording?",
      answer:
        "No. Tab audio capture is completely invisible. No bot joins the call, no notification appears, and others have no way to know you're recording.",
    },
    {
      question: "Should I tell the other person I'm recording?",
      answer:
        'Always. Even when the law doesn\'t require it, transparency builds trust. Try: "This conversation is important to me so I have an AI note-taker running. It helps me stay present instead of scribbling notes." If they say no, turn it off immediately. 11 US states require all-party consent (CA, FL, IL, MA, MD, CT, MI, MT, NH, PA, WA), so if any participant is in one of those states, disclosure is legally required.',
    },
    {
      question: "How long can I record?",
      answer:
        "Up to 25MB per chunk, which covers roughly 45 minutes of audio. Longer meetings are chunked automatically and stitched together in your transcript.",
    },
    {
      question: "Where does my data go?",
      answer:
        "Transcripts and analysis are stored in your Sales Blitz account. Only you can access them. We never share your recordings with anyone.",
    },
    {
      question: "What if the recording fails?",
      answer:
        "If audio capture drops, you'll see an error in the extension. Check browser console for details. Works best on Chromium-based browsers (Chrome, Edge, Brave).",
    },
    {
      question: "Does it work on mobile?",
      answer:
        "No. Chrome extensions don't run on mobile browsers. Use the web clients of Google Meet, Zoom, and Teams on a desktop or laptop.",
    },
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen">
      <AppNav currentPage="/extensions" />

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            Meeting Intelligence
          </h1>
          <p className="text-lg text-neutral-300">
            Record your calls, get transcripts with speaker detection, and receive AI coaching on your discovery, objection handling, and closing. All analysis feeds into your next blitz.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-12">
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-600 transition"
          >
            <Download className="h-5 w-5" />
            Get the extension
          </a>
        </div>

        {/* Setup Steps */}
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-bold text-white">
            Step-by-step setup
          </h2>
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex gap-4 rounded-xl border border-[#262626] bg-[#141414] p-5 hover:shadow-sm shadow-black/20 transition"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-300">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What You Get */}
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-bold text-white">
            What you get
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-[#262626] bg-[#141414] p-5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Supported Platforms */}
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-bold text-white">
            Supported platforms
          </h2>
          <div className="space-y-3">
            {platforms.map((platform, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#141414] p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a]">
                    <platform.icon className="h-5 w-5 text-neutral-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {platform.name}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <Check className="h-4 w-4" />
                  {platform.status}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-blue-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
            <p className="text-sm text-blue-900">
              Desktop apps require the web version for tab audio capture. Open Google Meet, Zoom, or Teams in your browser instead of the native app.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="mb-5 text-xl font-bold text-white">
            Frequently asked questions
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-[#262626] rounded-xl bg-[#141414] overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0a0a0a] transition"
                >
                  <h3 className="font-semibold text-white">
                    {faq.question}
                  </h3>
                  {expandedFaq === idx ? (
                    <ChevronUp className="h-5 w-5 shrink-0 text-neutral-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0 text-neutral-500" />
                  )}
                </button>
                {expandedFaq === idx && (
                  <div className="border-t border-[#262626] bg-[#0a0a0a] px-5 py-4">
                    <p className="text-sm text-neutral-200">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="mt-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center">
          <h2 className="text-lg font-bold text-white mb-2">
            Ready to record your calls?
          </h2>
          <p className="text-sm text-neutral-200 mb-5">
            Get the extension from Chrome Web Store and start capturing meeting intelligence.
          </p>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-600 transition"
          >
            <Download className="h-5 w-5" />
            Get the extension
          </a>
        </div>
      </main>
    </div>
  );
}
