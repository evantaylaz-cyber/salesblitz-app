import { SignUp } from "@clerk/nextjs";
import { Zap, ArrowRight, CheckCircle2 } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — value prop */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gray-900 px-12 py-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Sales Blitz
          </span>
        </div>

        {/* Hero */}
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

          {/* What you get */}
          <div className="mt-10 space-y-4">
            {[
              "Deep research on any account or prospect in minutes",
              "POV decks, call playbooks & outreach sequences",
              "AI practice mode with scored roleplay sessions",
              "Deal audits that stress-test your qualification",
              "Champion-building kits for complex deals",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                <p className="text-sm text-gray-300">{item}</p>
              </div>
            ))}
          </div>

          {/* Pricing teaser */}
          <div className="mt-10 rounded-xl border border-gray-700 bg-gray-800/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Starts at
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  $39<span className="text-base font-normal text-gray-500">/mo</span>
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

        {/* Bottom */}
        <p className="text-xs text-gray-600">
          No credit card required to explore. Cancel anytime.
        </p>
      </div>

      {/* Right panel — auth */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-50 px-6 py-10 lg:w-1/2">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Sales Blitz
          </span>
        </div>

        <div className="w-full max-w-md mx-auto">
        <SignUp
          afterSignUpUrl="/dashboard"
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
          Already have an account?{" "}
          <a href="/sign-in" className="text-emerald-700 hover:text-emerald-900 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
