import { SignUp } from "@clerk/nextjs";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — value prop (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#0a0a0a] px-12 py-10">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-128.png" alt="Sales Blitz" className="h-9 w-9" />
          <span className="text-xl font-bold tracking-tight text-white">
            Sales Blitz
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight text-white">
            Research. Rehearse.
            <br />
            <span className="text-emerald-400">Close.</span>
          </h1>
          <p className="mt-4 text-base text-neutral-400 leading-relaxed">
            Drop in a company name. Get deep research, cold outreach sequences,
            competitive playbooks and a POV deck in minutes. Then practice your
            pitch or interview against an AI persona who pushes back.
          </p>

          <div className="mt-10 space-y-4">
            {[
              "Deep research on any account, prospect, or interviewer in minutes",
              "Cold outreach sequences that earn replies, whether prospecting or job hunting",
              "POV decks, call playbooks & competitive intel for every meeting type",
              "AI practice mode with scored roleplay for calls, interviews & panels",
              "Interview prep with per-interviewer research, cheat sheets & mock scenarios",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                <p className="text-sm text-neutral-300">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-[#262626] bg-[#141414] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Starts at
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  $39
                  <span className="text-base font-normal text-neutral-500">
                    /mo
                  </span>
                </p>
              </div>
              <a
                href="/subscribe"
                className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition"
              >
                View plans <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <p className="text-xs text-neutral-600">
          No credit card required to explore. Cancel anytime.
        </p>
      </div>

      {/* Right panel — auth */}
      <div className="flex w-full flex-col items-center justify-center bg-[#111111] px-6 py-12 lg:w-1/2">
        {/* Mobile logo */}
        <div className="mb-6 flex items-center gap-2 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-64.png" alt="Sales Blitz" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-white">
            Sales Blitz
          </span>
        </div>

        <SignUp
          afterSignUpUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full max-w-sm mx-auto",
              card: "shadow-lg shadow-black/30 border border-[#262626] rounded-2xl bg-[#141414] p-6",
              headerTitle: "text-xl font-bold text-white",
              headerSubtitle: "text-sm text-neutral-400",
              socialButtonsBlockButton:
                "border-[#333333] bg-[#1a1a1a] text-neutral-200 hover:bg-[#262626] transition text-sm",
              formButtonPrimary:
                "bg-emerald-500 hover:bg-emerald-400 transition text-sm font-semibold rounded-lg text-black",
              footerActionLink:
                "text-emerald-400 hover:text-emerald-300 font-medium",
              formFieldInput:
                "border-[#333333] bg-[#0a0a0a] text-white focus:border-emerald-500 focus:ring-emerald-500 rounded-lg text-sm",
              formFieldLabel: "text-neutral-300 text-sm",
              footer: "text-sm",
              identityPreviewEditButton: "text-emerald-400",
              formFieldInputShowPasswordButton: "text-neutral-400",
              dividerLine: "bg-[#262626]",
              dividerText: "text-neutral-500",
            },
          }}
        />

        <p className="mt-4 text-center text-xs text-neutral-500 lg:hidden">
          Already have an account?{" "}
          <a
            href="/sign-in"
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
