import { SignIn } from "@clerk/nextjs";
import {
  Zap,
  Target,
  FileText,
  Video,
  BarChart3,
  Shield,
} from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand showcase */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gray-900 px-12 py-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-128.png" alt="Sales Blitz" className="h-9 w-9" />
          <span className="text-xl font-bold tracking-tight text-white">
            Sales Blitz
          </span>
        </div>

        {/* Hero content */}
        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight text-white">
            Research. Rehearse.
            <br />
            <span className="text-emerald-400">Close.</span>
          </h1>
          <p className="mt-4 text-base text-gray-400 leading-relaxed">
            Drop in a company name. Get a research brief, competitive
            playbook, call prep docs, and POV deck in minutes. Then practice
                        your pitch against an AI buyer who pushes back.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Target className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Deep account research</p>
                <p className="text-sm text-gray-500">Org charts, pain points & competitive positioning in minutes.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <FileText className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Battle-ready deliverables</p>
                <p className="text-sm text-gray-500">POV decks, call playbooks & outreach sequences tailored to each deal.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Video className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Live AI practice</p>
                <p className="text-sm text-gray-500">Roleplay against realistic personas. Scored on 8 dimensions.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-3">
          <Shield className="h-4 w-4 text-gray-600" />
          <p className="text-xs text-gray-600">
            Trusted by enterprise AEs preparing for six-figure deals.
          </p>
        </div>
      </div>

      {/* Right panel — auth */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-50 px-6 py-10 lg:w-1/2">
        {/* Mobile logo (hidden on desktop) */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-64.png" alt="Sales Blitz" className="h-9 w-9" />
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Sales Blitz
          </span>
        </div>

        <div className="w-full max-w-md mx-auto">
        <SignIn
          afterSignInUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full max-w-md mx-auto",
              card: "shadow-none border-0 bg-transparent p-0",
              headerTitle: "text-2xl font-bold text-gray-900",
              headerSubtitle: "text-gray-500",
              socialButtonsBlockButton:
                "border-gray-200 hover:bg-gray-50 transition",
              formButtonPrimary:
                "bg-emerald-600 hover:bg-emerald-700 transition text-sm font-semibold",
              footerActionLink: "text-emerald-700 hover:text-emerald-900",
              formFieldInput:
                "border-gray-200 focus:border-emerald-500 focus:ring-emerald-500",
            },
          }}
        />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="text-emerald-700 hover:text-emerald-900 font-medium">
            Start free
          </a>
        </p>
      </div>
    </div>
  );
}
