import { SignIn } from "@clerk/nextjs";
import { Target, FileText, Video, Shield } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand showcase (desktop only) */}
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
            Drop in a company name. Get deep research, a POV deck, outreach
            sequences &amp; speaker notes in minutes. Then practice your pitch
            or interview against an AI persona who pushes back.
          </p>

          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Target className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Deep research on any target
                </p>
                <p className="text-sm text-neutral-500">
                  Org charts, pain points & competitive positioning for deals or
                  interviews.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <FileText className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Battle-ready deliverables
                </p>
                <p className="text-sm text-neutral-500">
                  POV decks, speaker notes &amp; outreach sequences for every
                  meeting type.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Video className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Live AI practice
                </p>
                <p className="text-sm text-neutral-500">
                  Roleplay against realistic personas. Scored on 8 dimensions.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Shield className="h-4 w-4 text-neutral-600" />
          <p className="text-xs text-neutral-600">
            Used by AEs closing enterprise deals &amp; reps navigating career transitions.
          </p>
        </div>
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

        <SignIn
          afterSignInUrl="/dashboard"
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
          Don&apos;t have an account?{" "}
          <a
            href="/sign-up"
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            Start free
          </a>
        </p>
      </div>
    </div>
  );
}
