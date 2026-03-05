import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Target,
  Zap,
  BarChart3,
  FileText,
  Users,
  Shield,
  ArrowRight,
  Check,
  Clock,
  Star,
  Layers,
  Brain,
  Mail,
  TrendingUp,
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
            <a href="#tools" className="text-sm text-gray-600 hover:text-gray-900">
              Tools
            </a>
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
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Zap className="h-4 w-4" />
              AI-Powered Sales Intelligence
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Walk into every deal{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                fully armed
              </span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 md:text-xl">
              Submit a prospect, company, or job opportunity. Get back a complete intelligence
              package — research briefs, POV decks, competitive landscapes, and battle-tested
              talk tracks — delivered to your inbox in minutes.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 hover:shadow-xl"
              >
                Get Started <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                See How It Works
              </a>
            </div>
            <p className="mt-6 text-sm text-gray-400">
              6 tools. Results in under 15 minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">6</div>
              <div className="mt-1 text-sm text-gray-500">Specialized Tools</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">5-10</div>
              <div className="mt-1 text-sm text-gray-500">Deliverables Per Run</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">&lt;15 min</div>
              <div className="mt-1 text-sm text-gray-500">Average Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">10x</div>
              <div className="mt-1 text-sm text-gray-500">Faster Than Manual Research</div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Every deliverable a top seller needs
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Each run produces a complete intelligence package — not templates, not outlines,
              but finished assets ready to use in your next meeting.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FileText,
                title: "Research Briefs (PDF)",
                description:
                  "Deep-dive intelligence on the company, competitive landscape, qualification mapping, and strategic positioning — 15-20 pages of weaponized research.",
              },
              {
                icon: BarChart3,
                title: "POV Decks (PDF)",
                description:
                  "5-slide executive presentation: the challenge they face, your approach, proof points, and a clear next step. Ready to send or present.",
              },
              {
                icon: Layers,
                title: "Interactive Landscape",
                description:
                  "A live HTML competitive positioning map showing where every competitor sits on the axes that matter. Click to expand any rival.",
              },
              {
                icon: Mail,
                title: "Handwritten Cards (PNG)",
                description:
                  "Client POV cards and call sheets designed to look hand-drawn — personal, memorable, impossible to ignore.",
              },
              {
                icon: Brain,
                title: "Discovery Plans & Prep Sheets",
                description:
                  "Pre-built discovery question flows, objection handling matrices, and one-page prep sheets you can glance at before a call.",
              },
              {
                icon: TrendingUp,
                title: "Batch Territory Analysis",
                description:
                  "Submit 2-10 accounts at once. Get per-account deliverables plus a comparative scorecard ranking your best opportunities.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <item.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section id="tools" className="border-y border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">6 tools built for sellers</h2>
            <p className="mt-4 text-lg text-gray-500">
              Whether you&apos;re interviewing, prospecting, or closing — there&apos;s a tool
              purpose-built for that moment in the sales cycle.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Interview Outreach",
                tier: "Launch",
                description: "Land the interview. Resume polish, outreach sequences, target mapping, and networking playbook.",
                price: "$15/run",
              },
              {
                name: "Prospect Outreach",
                tier: "Launch",
                description: "Get the meeting. ICP mapping, multi-channel sequences, personalization frameworks, objection handling.",
                price: "$15/run",
              },
              {
                name: "Interview Prep",
                tier: "Pro",
                description: "Crush the interview. Qualification map, STAR stories, 30/60/90, discovery questions, prep sheet, landscape app.",
                price: "$12/run",
              },
              {
                name: "Prospect Prep",
                tier: "Pro",
                description: "Own the discovery call. Account research, competitive positioning, business case framework, landscape app.",
                price: "$12/run",
              },
              {
                name: "Deal Audit",
                tier: "Pro",
                description: "Stress-test your deal. Qualification scorecard, risk report, health card, strategy brief, landscape app.",
                price: "$12/run",
              },
              {
                name: "Champion Builder",
                tier: "Closer",
                description: "Build your internal champion. Stakeholder map, development plan, internal selling kit, coaching card.",
                price: "$10/run",
              },
            ].map((tool) => (
              <div
                key={tool.name}
                className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      tool.tier === "Launch"
                        ? "bg-emerald-100 text-emerald-700"
                        : tool.tier === "Pro"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {tool.tier}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-500">{tool.description}</p>
                <p className="mt-3 text-sm font-medium text-gray-700">{tool.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">Three steps. Fifteen minutes.</h2>
            <p className="mt-4 text-lg text-gray-500">
              From zero context to a complete intelligence package — faster than you can read a
              10-K.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Target,
                title: "Submit your target",
                description:
                  "Pick a tool, enter the company name and prospect LinkedIn. That's it — our AI auto-fills the rest from public data.",
              },
              {
                step: "02",
                icon: Brain,
                title: "AI does the heavy lifting",
                description:
                  "Claude runs deep competitive research, market analysis, and company intelligence. Synthesizes everything into a strategic narrative.",
              },
              {
                step: "03",
                icon: Mail,
                title: "Deliverables hit your inbox",
                description:
                  "Research brief PDF, POV deck, interactive landscape, handwritten cards, and prep sheets — all formatted and ready to use.",
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

      {/* Pricing */}
      <section id="pricing" className="border-y border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing. No surprises.</h2>
            <p className="mt-4 text-lg text-gray-500">
              Each run produces a full deliverable package. Pick the tier that matches your role.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                name: "Launch",
                price: 49,
                annual: 39,
                runs: 4,
                tools: ["Interview Outreach", "Prospect Outreach"],
                highlight: false,
                cta: "Get Launch",
              },
              {
                name: "Pro",
                price: 99,
                annual: 79,
                runs: 12,
                tools: [
                  "Interview Outreach",
                  "Prospect Outreach",
                  "Interview Prep",
                  "Prospect Prep",
                  "Deal Audit",
                ],
                highlight: true,
                cta: "Get Pro",
              },
              {
                name: "Closer",
                price: 179,
                annual: 149,
                runs: 25,
                tools: [
                  "All 6 tools",
                  "Priority processing",
                  "Quarterly strategy call",
                ],
                highlight: false,
                cta: "Get Closer",
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
                  {tier.runs} runs/month · Billed annually
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
                  {tier.tools.map((t) => (
                    <div key={t} className="flex items-center text-sm text-gray-700">
                      <Check className="mr-2 h-4 w-4 shrink-0 text-emerald-500" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              Need more runs? Add{" "}
              <Link href="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-700">
                run packs
              </Link>{" "}
              starting at $8/run. Or grab the{" "}
              <Link href="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-700">
                Interview Sprint
              </Link>{" "}
              — 6 runs for $149 (no subscription required).
            </p>
          </div>
        </div>
      </section>

      {/* Batch Mode Highlight */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-10 md:p-16">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white">
                <Users className="h-4 w-4" />
                Batch Mode
              </div>
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                Map an entire territory in one shot
              </h2>
              <p className="mt-4 text-lg text-indigo-100">
                Submit 2-10 accounts. Get per-account intelligence plus a comparative analysis
                that ranks your best opportunities and tells you where to start. One submission,
                one price, exponentially more insight.
              </p>
              <Link
                href="/sign-up"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-gray-50"
              >
                Try Batch Mode <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Stop showing up unprepared
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Your competitors are walking into calls with half the context. You&apos;ll walk in
              with a 20-page brief, a POV deck, and a competitive landscape you can pull up
              mid-conversation.
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
