# AltVest Subscriber App — Project Context

> Cross-session memory file. Read this at the start of every new session.
> Last updated: 2026-02-28

## What This Is
AI-powered competitive intelligence SaaS for B2B sales professionals. Users submit a target company/person, the system runs deep research via Claude API, and delivers 5-10 polished documents (DOCX/PDF) plus an interactive competitive landscape app.

## Tech Stack
- **Frontend**: Next.js 14.2.5 (App Router), React 18, Tailwind CSS
- **Auth**: Clerk (`@clerk/nextjs`)
- **Payments**: Stripe (subscriptions + one-time run packs)
- **Database**: Supabase PostgreSQL via Prisma ORM v5.22.0
- **Email**: Resend
- **Hosting**: Vercel (frontend + API routes)
- **Worker**: Railway (Phase 2 execution engine — in progress)

## Deployment Info
- **Vercel team**: `team_v8AivDcfMgT9Z3UDAazeLr6p` (slug: `evans-projects-30718325`)
- **Vercel project**: `prj_KjaRFC7ASHwO7qlXHkhy3J13Iz7S`
- **GitHub repo**: `evantaylaz-cyber/altvest-subscriber-app` (public)
- **Supabase project**: Check Supabase MCP for current project ID
- **Build command**: `prisma generate && prisma db push --accept-data-loss && next build`

## Six Tools (Products)
| Tool | Min Tier | Price/Run | Deliverables |
|------|----------|-----------|-------------|
| Interview Outreach | Launch | $15 | Resume, outreach sequences, target mapping, networking playbook |
| Prospect Outreach | Launch | $15 | ICP mapping, multi-channel sequences, personalization, objection handling |
| Interview Prep | Pro | $12 | MEDDPICC map, STAR stories, 30/60/90, discovery Qs, cheat sheet, landscape app |
| Prospect Prep | Pro | $12 | Account research, discovery plan, competitive positioning, business case, landscape app |
| Deal Audit | Pro | $12 | MEDDPICC scorecard, risk report, health card, strategy brief, landscape app |
| Champion Builder | Closer | $10 | Champion profile, stakeholder map, dev plan, internal selling kit, coaching card |

## Subscription Tiers
- **Launch**: 4 runs/month, Launch tools
- **Pro**: 12 runs/month, Launch + Pro tools
- **Closer**: 25 runs/month, all tools + priority processing

## Key API Endpoints
- `POST /api/requests` — Submit run (consumes run, initializes steps, emails admin)
- `GET /api/requests` — List user's requests
- `GET /api/requests/[id]` — Single request with progress %
- `PATCH /api/requests/[id]/steps` — Update step progress (admin or `x-api-key` auth)
- `GET /api/assets/[...path]` — Proxy to Supabase storage (Clerk auth, serves PDFs/PNGs)
- `POST /api/fetch-url` — Fetches public URLs, Claude extracts structured data (for auto-fill)
- `POST /api/checkout` — Stripe checkout session
- Stripe webhooks at `/api/webhooks/stripe`

## Execution Pipeline (per run)
```
submitted → [awaiting_clarification →] researching → generating → ready → delivered
```
Steps: competitive_research → market_intel → company_deep_dive → strategic_synthesis → generating_assets → [building_landscape_app] → formatting → delivery

Research steps use Claude Sonnet 4.5 (standard) or Opus 4.6 (high-context tools).
Asset generation: PDFs via PDFKit, handwritten cards via Gemini, landscape via HTML generator.
Delivery: styled email via Resend with asset links, then status → "delivered".
Pre-execution: sparse inputs trigger clarification questions (Haiku) + email to user.
Budget: BudgetGuardian tracks daily spend via `api_usage` table, alerts at 50/75/90%.
Retry: transient API errors (429/500/529) retry 3x with exponential backoff.
The PATCH endpoint accepts `x-api-key` header for worker auth (`INTERNAL_API_KEY` env var).

## Phase Status
- [x] Phase 1: Job queue + status tracking (COMPLETE, deployed)
- [x] Phase 2: Execution engine (single-account research + generation) — CODE COMPLETE, AWAITING DEPLOY
- [ ] Phase 2.5: Batch mode + tiering (multi-account research + scoring)

## Known Gotchas
- Prisma `JsonArray` can't directly cast to custom types — must go through `unknown` first
- Vercel serverless timeout: 60s on Pro plan — worker MUST run on Railway
- GitHub's CodeMirror editor doesn't support Ctrl+H/F find-replace via keyboard shortcuts
- Build command includes `prisma db push --accept-data-loss` — be careful with schema changes
- RunRequest + User tables use camelCase columns (no Prisma `@@map`). user_profile uses snake_case (has `@@map`). Supabase JS queries must use actual DB column names.
- Assets bucket is PRIVATE. Worker uploads with service key, subscriber app proxies via `/api/assets/` with Clerk auth.
- `api_usage` table uses snake_case columns (created directly in Supabase, not via Prisma).

## Environment Variables (Vercel — subscriber app)
CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, DATABASE_URL, DIRECT_URL, RESEND_API_KEY, RESEND_FROM_EMAIL, INTERNAL_API_KEY, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, WORKER_WEBHOOK_URL, NEXT_PUBLIC_APP_URL, plus all Stripe price IDs (LAUNCH_MONTHLY_PRICE_ID, etc.)

## Environment Variables (Railway — worker)
ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, ALTVEST_APP_URL, INTERNAL_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, DAILY_SPEND_LIMIT, NOTIFICATION_EMAIL, TAVILY_API_KEY, PORT

## Worker Architecture
- **Repo**: `evantaylaz-cyber/altvest-worker`
- **Hosting**: Railway (`fa4c5482-3d40-482a-9da3-60fa5bbc01c6`)
- **Entrypoint**: `src/index.js` — Express server with /execute, /health, /status
- **Key files**: executor.js (pipeline), budget-guardian.js (spend tracking), step-client.js (PATCH proxy), pdf-generator.js, gemini-cards.js, landscape-generator.js
- **Storage**: Supabase storage bucket "assets" (PRIVATE — accessed via service key)
- **Database tables used**: RunRequest, User, user_profile, api_usage

## Owner
- **Name**: Evan
- **Email**: evan.tay.laz@gmail.com
- **GitHub**: evantaylaz-cyber
