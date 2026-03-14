"use client";

import { useState, useEffect } from "react";
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
  Shield,
  Loader2,
} from "lucide-react";
import AppNav from "@/components/AppNav";

export default function ExtensionsPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Recording consent acknowledgment
  const [consentAcknowledged, setConsentAcknowledged] = useState<boolean | null>(null);
  const [consentChecks, setConsentChecks] = useState({
    disclosure: false,
    employerPolicy: false,
    retention: false,
  });
  const [savingConsent, setSavingConsent] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile?.recordingConsentAcknowledgedAt) {
          setConsentAcknowledged(true);
        } else {
          setConsentAcknowledged(false);
        }
      })
      .catch(() => setConsentAcknowledged(false));
  }, []);

  const allChecked =
    consentChecks.disclosure &&
    consentChecks.employerPolicy &&
    consentChecks.retention;

  async function acknowledgeConsent() {
    setSavingConsent(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordingConsentAcknowledgedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setConsentAcknowledged(true);
      }
    } catch {
      // Silent fail, they can try again
    } finally {
      setSavingConsent(false);
    }
  }

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
      title: "Join a meeting and disclose",
      description:
        'Start any call on Google Meet, Zoom web, or Teams web. Let participants know you have a note-taker running: "I have an AI note-taker so I can stay focused on our conversation instead of scribbling notes. Cool?"',
    },
    {
      number: 5,
      title: "Click Record",
      description:
        "Hit the Record button in the extension. Audio captures from your browser tab only. No bot joins the call.",
    },
    {
      number: 6,
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
      question: "Do I need to tell people I'm recording?",
      answer:
        'Yes, always. Disclosure is the right thing to do and it builds trust. A simple heads-up at the start of the call is all it takes: "I have an AI note-taker running so I can stay present instead of scribbling notes. That cool with you?" If they say no, turn it off immediately. 11 US states also legally require all-party consent (CA, FL, IL, MA, MD, CT, MI, MT, NH, PA, WA).',
    },
    {
      question: "Does a bot join my call?",
      answer:
        "No. The extension captures audio from your browser tab directly. No bot enters the meeting room, so there's no disruption to the conversation.",
    },
    {
      question: "How long can I record?",
      answer:
        "Up to 25MB per chunk, which covers roughly 45 minutes of audio. Longer meetings are chunked automatically and stitched together in your transcript.",
    },
    {
      question: "Where does my data go?",
      answer:
        "Raw audio is deleted from our servers within 24 hours of transcription. Transcripts are kept for 90 days, then automatically deleted. Coaching scores and skill assessments stay in your account as part of your professional development record. We never share your recordings with anyone.",
    },
    {
      question: "What if my employer has a no-recording policy?",
      answer:
        "Always follow your employer's policies. If your company restricts meeting recordings, don't use the extension for those meetings. Sales Blitz is a professional development tool, not a workaround for company policies. The prep and practice tools work great without recordings.",
    },
    {
      question: "What if the recording fails?",
      answer:
        "If audio capture drops, you'll see an error in the extension. Works best on Chromium-based browsers (Chrome, Edge, Brave).",
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
    <div className="min-h-screen bg-[#0a0a0a]">
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

        {/* Recording Disclosure Acknowledgment */}
        {consentAcknowledged === false && (
          <section className="mb-12">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">
                    Before your first recording
                  </h3>
                  <p className="mt-1 text-sm text-neutral-300">
                    Please confirm you understand your responsibilities when
                    recording meetings.
                  </p>
                </div>
              </div>

              <div className="space-y-3 ml-8">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consentChecks.disclosure}
                    onChange={(e) =>
                      setConsentChecks((prev) => ({
                        ...prev,
                        disclosure: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-emerald-500 focus:ring-emerald-500 shrink-0"
                  />
                  <span className="text-sm text-neutral-200 group-hover:text-white transition">
                    I will tell all participants that I am recording before I
                    start. If anyone objects, I will turn it off immediately.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consentChecks.employerPolicy}
                    onChange={(e) =>
                      setConsentChecks((prev) => ({
                        ...prev,
                        employerPolicy: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-emerald-500 focus:ring-emerald-500 shrink-0"
                  />
                  <span className="text-sm text-neutral-200 group-hover:text-white transition">
                    I understand that my employer&apos;s recording and data
                    handling policies apply, and I will follow them.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consentChecks.retention}
                    onChange={(e) =>
                      setConsentChecks((prev) => ({
                        ...prev,
                        retention: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-emerald-500 focus:ring-emerald-500 shrink-0"
                  />
                  <span className="text-sm text-neutral-200 group-hover:text-white transition">
                    I understand that transcripts are automatically deleted after
                    90 days. Coaching scores and skill assessments are retained.
                  </span>
                </label>
              </div>

              <div className="mt-5 ml-8">
                <button
                  onClick={acknowledgeConsent}
                  disabled={!allChecked || savingConsent}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingConsent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {savingConsent ? "Saving..." : "I understand, let me record"}
                </button>
              </div>
            </div>
          </section>
        )}

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
