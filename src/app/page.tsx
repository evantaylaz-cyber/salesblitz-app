import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Target,
  ArrowRight,
  Check,
} from "lucide-react";

export default async function LandingPage() {
  const { userId } = auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">AltVest</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
              How It Works
            </a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Walk into every deal{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                fully armed
              </span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 md:text-xl">
              Submit a prospect. Get back a complete intelligence package, ready
              to use in your next meeting. Delivered in minutes, not days.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 hover:shadow-xl"
              >
                Get Started <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/demo/prospect_prep"
                className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                See a Sample Run
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
            <p className="mt-4 text-lg text-gray-500">
              Three steps. Under fifteen minutes.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Pick a tool, drop in a name",
                description:
                  "Company name, prospect LinkedIn, role context. That's all we need.",
              },
              {
                step: "02",
                title: "We build your package",
                description:
                  "Deep research, competitive analysis, strategic positioning. Synthesized into finished assets.",
              },
              {
                step: "03",
                title: "Open your inbox",
                description:
                  "Everything's there. Research briefs, decks, talk tracks, interactive playbooks. Ready to use.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              A tool for every stage of the deal
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Whether you&apos;re landing the meeting, prepping for it, or closing the deal.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Interview Outreach",
                hook: "Land the interview.",
                description: "Resume, outreach sequence, and a research package that gets you noticed.",
              },
              {
                name: "Prospect Outreach",
                hook: "Get the meeting.",
                description: "Multi-channel sequences backed by deep account intelligence.",
              },
              {
                name: "Interview Prep",
                hook: "Win the interview.",
                description: "Call playbooks, competitive intel, and prep docs tailored to your meeting.",
              },
              {
                name: "Prospect Prep",
                hook: "Own the call.",
                description: "Discovery plans, stakeholder maps, and competitive positioning for any meeting type.",
              },
              {
                name: "Deal Audit",
                hook: "Stress-test your deal.",
                description: "Qualification scorecard, risk flags, and a strategy to close the gaps.",
              },
              {
                name: "Champion Builder",
                hook: "Arm your champion.",
                description: "Stakeholder maps, internal selling kits, and the ammo they need to advocate for you.",
              },
            ].map((tool) => (
              <div
                key={tool.name}
                className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-sm"
              >
                <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{tool.hook}</span>{" "}
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing</h2>
            <p className="mt-4 text-lg text-gray-500">
              Every run produces a complete deliverable package. No per-asset charges.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                name: "Launch",
                price: 49,
                annual: 39,
                runs: 4,
                features: [
                  "Interview Outreach",
                  "Prospect Outreach",
                  "4 runs/month",
                ],
                highlight: false,
                cta: "Get Started",
              },
              {
                name: "Pro",
                price: 99,
                annual: 79,
                runs: 12,
                features: [
                  "Everything in Launch",
                  "Interview Prep",
                  "Prospect Prep",
                  "Deal Audit",
                  "12 runs/month",
                ],
                highlight: true,
                cta: "Get Started",
              },
              {
                name: "Closer",
                price: 179,
                annual: 149,
                runs: 25,
                features: [
                  "Everything in Pro",
                  "Champion Builder",
                  "25 runs/month",
                  "Priority processing",
                ],
                highlight: false,
                cta: "Get Started",
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border-2 bg-white p-8 ${
                  tier.highlight
                    ? "border-indigo-500 shadow-lg shadow-indigo-100"
                    : "border-gray-200"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">${tier.annual}</span>
                  <span className="text-gray-500">/mo</span>
                  <span className="ml-2 text-sm text-gray-400 line-through">
                    ${tier.price}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Billed annually
                </p>
                <Link
                  href="/sign-up"
                  className={`mt-6 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition ${
                    tier.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {tier.cta}
                </Link>
                <div className="mt-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-center text-sm text-gray-700">
                      <Check className="mr-2 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              Need more runs?{" "}
              <Link href="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-700">
                Run packs
              </Link>{" "}
              start at $8/run.{" "}
              <Link href="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-700">
                Interview Sprint
              </Link>{" "}
              is 6 runs for $149, no subscription needed.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Stop showing up unprepared
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Your next meeting is too important to wing it.
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 hover:shadow-xl"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-4 text-sm text-gray-400">
              Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                <Target className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">AltVest</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/sign-in" className="hover:text-gray-700">
                Sign In
              </Link>
              <Link href="/sign-up" className="hover:text-gray-700">
                Sign Up
              </Link>
              <a href="#pricing" className="hover:text-gray-700">
                Pricing
              </a>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} AltVest. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
