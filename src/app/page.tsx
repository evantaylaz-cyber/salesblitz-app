import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Target,
  ArrowRight,
  Check,
  Video,
  Mic,
  BarChart3,
  MessageSquare,
  Mail,
  Users,
  Rocket,
  Shield,
} from "lucide-react";
import ProductMockup from "@/components/ProductMockup";

export default async function LandingPage() {
  const { userId } = auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Sales Blitz</span>
          </div>
          <div className="absolute inset-x-0 hidden items-center justify-center gap-8 md:flex pointer-events-none">
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 pointer-events-auto">
              How It Works
            </a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 pointer-events-auto">
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
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-green-50" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Research. Rehearse.{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
                Close.
              </span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 md:text-xl">
              Drop in a company name. Get a research brief, competitive
              playbook, call prep docs, and POV deck in minutes. Then
              practice your pitch against an AI buyer who pushes back.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-xl"
              >
                Start Free <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/demo/prospect_prep"
                className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                See a Sample Run
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400">No credit card required. 2 free runs included.</p>

            {/* Who it's for */}
            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
              <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">Built for</span>
              <span className="text-sm text-gray-500">Enterprise AEs prepping for six-figure meetings</span>
              <span className="hidden sm:inline text-gray-300">&middot;</span>
              <span className="text-sm text-gray-500">SDRs booking discovery calls</span>
              <span className="hidden sm:inline text-gray-300">&middot;</span>
              <span className="text-sm text-gray-500">Candidates preparing for career-changing interviews</span>
            </div>
          </div>

          {/* Product visual */}
          <div className="mt-16 md:mt-24">
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
            <p className="mt-4 text-lg text-gray-500">
              Three inputs. Eight finished assets. In minutes.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Drop in a target",
                description:
                  "Company name, prospect LinkedIn, and meeting type. Sales Blitz pulls everything else from public sources, your profile, and your knowledge base.",
              },
              {
                step: "2",
                title: "AI does the research",
                description:
                  "Deep company analysis, competitive mapping, stakeholder intelligence, and pain-point identification. Structured around value-based selling, personalized to your resume and deal history.",
              },
              {
                step: "3",
                title: "Walk in armed",
                description:
                  "Research brief, competitive playbook, call prep sheet, POV deck, and more. Finished assets, not templates. Then practice the call against an AI avatar before you go live.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">
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
                name: "Interview Prep",
                hook: "Win the interview.",
                description: "Call playbooks, competitive intel, and prep docs tailored to your meeting.",
              },
              {
                name: "Deal Audit",
                hook: "Stress-test your deal.",
                description: "Qualification scorecard, risk flags, and a strategy to close the gaps.",
              },
              {
                name: "Prospect Outreach",
                hook: "Get the meeting.",
                description: "Multi-channel sequences backed by deep account intelligence.",
              },
              {
                name: "Prospect Prep",
                hook: "Own the call.",
                description: "Discovery plans, stakeholder maps, and competitive positioning for any meeting type.",
              },
              {
                name: "Champion Builder",
                hook: "Arm your champion.",
                description: "Stakeholder maps, internal selling kits, and the ammo they need to advocate for you.",
              },
              {
                name: "AI Practice Mode",
                hook: "Rehearse before the real thing.",
                description: "Live video roleplay against an AI persona built from your research. Prep for prospect calls, interviews & panels.",
              },
              {
                name: "Territory Blitz",
                hook: "Map your entire territory.",
                comingSoon: true,
                description: "Automated account prioritization, trigger monitoring, and outreach sequencing across your full book.",
              },
              {
                name: "Win/Loss Analyst",
                hook: "Learn from every outcome.",
                comingSoon: true,
                description: "Post-deal analysis with pattern recognition, coaching insights, and story bank extraction.",
              },
            ].map((tool: { name: string; hook: string; description: string; comingSoon?: boolean }) => (
              <div
                key={tool.name}
                className={`relative rounded-xl border p-6 transition ${
                  tool.comingSoon
                    ? "border-gray-100 bg-gray-50"
                    : "border-gray-200 bg-white hover:border-emerald-200 hover:shadow-sm"
                }`}
              >
                {tool.comingSoon && (
                  <span className="absolute top-3 right-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Coming Soon
                  </span>
                )}
                <h3 className={`font-semibold ${tool.comingSoon ? "text-gray-500" : "text-gray-900"}`}>{tool.name}</h3>
                <p className={`mt-2 text-sm ${tool.comingSoon ? "text-gray-400" : "text-gray-500"}`}>
                  <span className={`font-medium ${tool.comingSoon ? "text-gray-500" : "text-gray-700"}`}>{tool.hook}</span>{" "}
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Practice Mode */}
      <section className="border-y border-gray-100 bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950 py-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                <Video className="h-3.5 w-3.5" />
                AI Practice Mode
              </div>
              <h2 className="mt-4 text-3xl font-bold text-white">
                Rehearse against someone who knows your deal
              </h2>
              <p className="mt-4 text-lg text-gray-400">
                Name a target company. We generate a persona from real
                research, your profile & your blitz run data. Practice a
                live conversation against a video avatar who pushes back, asks
                tough questions & scores you across 8 performance dimensions.
                Works for prospect calls, interview panels, or any high-stakes meeting.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: <Mic className="h-4 w-4 text-emerald-400" />,
                    text: "Voice-driven conversation with a streaming video avatar",
                  },
                  {
                    icon: <MessageSquare className="h-4 w-4 text-emerald-400" />,
                    text: "Persona built from your actual research, not generic scripts. Works for sales calls & interviews.",
                  },
                  {
                    icon: <BarChart3 className="h-4 w-4 text-emerald-400" />,
                    text: "Scored on 8 value selling dimensions with coaching feedback after every session",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      {item.icon}
                    </div>
                    <span className="text-sm text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Practice session mockup */}
            <div className="relative">
              <div className="rounded-2xl border border-gray-700 bg-gray-800 p-1 shadow-2xl">
                {/* Top bar */}
                <div className="flex items-center justify-between rounded-t-xl bg-gray-800 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-gray-400">Live Session</span>
                  </div>
                  <span className="text-xs text-gray-500">4:32</span>
                </div>

                {/* Avatar area */}
                <div className="relative mx-2 aspect-video rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 overflow-hidden">
                  {/* Avatar photo */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="h-28 w-28 rounded-full overflow-hidden ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-gray-800">
                        {/* SVG fallback behind image */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500/30 to-green-500/30">
                          <svg className="h-16 w-16 text-emerald-300/50" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/avatar-practice.png"
                          alt="AI Buyer Persona"
                          className="relative h-full w-full object-cover"
                        />
                      </div>
                      {/* Speaking indicator */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
                        <div className="h-2 w-0.5 rounded-full bg-emerald-400 animate-pulse" />
                        <div className="h-3 w-0.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-0.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                  {/* Persona label */}
                  <div className="absolute top-3 left-3 rounded-lg bg-black/50 px-2 py-1">
                    <p className="text-[10px] font-medium text-white">Jamie Torres</p>
                    <p className="text-[9px] text-gray-400">VP Procurement, Acme Corp</p>
                  </div>
                </div>

                {/* Transcript preview */}
                <div className="mx-2 mt-2 mb-2 space-y-2 rounded-lg bg-gray-900/60 p-3">
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-xl bg-gray-700 px-3 py-1.5">
                      <p className="text-[10px] text-gray-300">
                        Walk me through how you&apos;d approach our enablement challenges at scale.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[75%] rounded-xl bg-emerald-600 px-3 py-1.5">
                      <p className="text-[10px] text-white">
                        Based on what I&apos;m seeing in your 10-K, you&apos;re scaling headcount 40% but enablement...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mic control */}
                <div className="flex items-center justify-center py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 ring-4 ring-red-600/20">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Floating score card */}
              <div className="absolute -bottom-4 -right-4 rounded-xl border border-gray-700 bg-gray-800 p-3 shadow-xl lg:-right-8">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] font-semibold text-gray-300">Session Score</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Before State", score: 4.5 },
                    { label: "Discovery", score: 4.0 },
                    { label: "Objections", score: 3.5 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="w-16 text-[9px] text-gray-400">{item.label}</span>
                      <div className="h-1 w-16 rounded-full bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${(item.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-medium text-gray-300">{item.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing</h2>
            <p className="mt-4 text-lg text-gray-500">
              Every run produces a full package. No per-asset charges.
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Prices shown with annual billing. Monthly plans also available.
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
                  "4 blitzes/month",
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
                  "AI Practice Mode (3 sessions/mo)",
                  "12 blitzes/month",
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
                  "Deal Audit",
                  "Champion Builder",
                  "AI Practice Mode (10 sessions/mo)",
                  "25 blitzes/month",
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
                    ? "border-emerald-500 shadow-lg shadow-emerald-100"
                    : "border-gray-200"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
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
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
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
              <Link href="/sign-up" className="font-medium text-emerald-700 hover:text-emerald-800">
                Run packs
              </Link>{" "}
              start at $8/run.{" "}
              <Link href="/sign-up" className="font-medium text-emerald-700 hover:text-emerald-800">
                Interview Sprint
              </Link>{" "}
              is 6 runs for $149, no subscription needed.
            </p>
          </div>
        </div>
      </section>

      {/* Sales Blitz Consulting */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border-2 border-gray-800 bg-gray-900 p-10 md:p-14">
              <div className="flex flex-col md:flex-row md:items-start md:gap-12">
                {/* Left: Copy */}
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                    <Users className="h-3.5 w-3.5" />
                    Done-For-You
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
                    Want us to do it for you?
                  </h2>
                  <p className="mt-4 text-gray-400">
                    The self-serve app handles research, prep & practice.
                    But if you want a team that builds target lists, runs outreach,
                    preps your calls & closes deals alongside you, we do that too.
                  </p>
                  <div className="mt-6 space-y-3">
                    {[
                      {
                        icon: <Target className="h-4 w-4 text-emerald-400" />,
                        text: "We build target lists, run outreach & deliver qualified meetings",
                      },
                      {
                        icon: <Rocket className="h-4 w-4 text-emerald-400" />,
                        text: "We prep your calls, arm your champions & close deals alongside you",
                      },
                      {
                        icon: <Shield className="h-4 w-4 text-emerald-400" />,
                        text: "Anything sales-related, we handle it. Pay per outcome.",
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                          {item.icon}
                        </div>
                        <span className="text-sm text-gray-300">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href="mailto:evan@salesblitz.ai?subject=Sales%20Blitz%20Consulting"
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <Mail className="h-4 w-4" />
                    Talk to Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Common questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "What exactly do I get from a single run?",
                a: "Each tool produces a full package of finished assets, not templates. A Prospect Prep run delivers a research brief (PDF), competitive playbook (interactive HTML), call prep sheet, POV deck, and stakeholder map. Formatted, sourced, and ready to use before your meeting.",
              },
              {
                q: "How does AI Practice Mode work?",
                a: "You talk to an AI avatar that plays your buyer, interviewer, or panel member. The persona is built from your actual research data, not generic scripts. They push back, ask tough questions, and score you across 8 performance dimensions when you're done.",
              },
              {
                q: "How long does a run take?",
                a: "Most runs finish in 10 to 15 minutes. Enter a company name, a prospect LinkedIn URL, and pick a meeting type. Sales Blitz handles the rest. You get a notification when your deliverables are ready.",
              },
              {
                q: "What's the difference between Interview and Prospect tools?",
                a: "Interview tools are for job seekers. They research the company from your perspective as a candidate and build interview-specific prep. Prospect tools do the same for active deals: account research, stakeholder mapping, competitive positioning, and outreach.",
              },
              {
                q: "Can I try it before subscribing?",
                a: "Yes. Every new account gets 2 free runs, no credit card required. Pick any tool, run it against a real target, and see the full output. If you're between jobs, the Interview Sprint gives you 6 runs for $149 with no subscription.",
              },
              {
                q: "Is my data private?",
                a: "Your profile, research data, and practice sessions are yours. We don't share your data with other users or use it to train models. All data is encrypted at rest, and every connection uses TLS.",
              },
            ].map((item) => (
              <details key={item.q} className="group rounded-xl border border-gray-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-semibold text-gray-900">
                  {item.q}
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-5 pb-5 text-sm text-gray-500 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Your next meeting is too important to wing it
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Research it. Rehearse it. Own it.
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-xl"
            >
              Start Free <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-4 text-sm text-gray-400">
              No credit card required. 2 free runs included.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">Sales Blitz</span>
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
              <a href="mailto:evan@salesblitz.ai" className="hover:text-gray-700">
                Contact
              </a>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Shield className="h-3.5 w-3.5" />
                TLS encrypted
              </div>
              <p className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} Sales Blitz
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
