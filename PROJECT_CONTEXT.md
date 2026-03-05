# AltVest Subscriber App — Project Context

> Cross-session memory file. Read this at the start of every new session.
> Last updated: 2026-03-03

## What This Is
AI-powered competitive intelligence SaaS for B2B sales professionals. Users submit a target company/person, the system runs deep research via Claude API, and delivers 5-10 polished documents (DOCX/PDF) plus an interactive competitive landscape app.

## Tech Stack
- **Frontend**: Next.js 14.2.5 (App Router), React 18, Tailwind CSS
- **Auth**: Clerk (`@clerk/nextjs`)
- **Payments**: Stripe (subscriptions + one-time run packs)
- **Database**: Supabase PostgreSQL via Prisma ORM v5.22.0
- **Email**: Resend
- **Hosting**: Vercel (frontend + API routes)
- **Worker**: Railway (Phase 2 execution engine — DEPLOYED)

## Deployment Info
- **Vercel team**: `team_v8AivDcfMgT9Z3UDAazeLr6p` (slug: `evans-projects-30718325`)
- **Vercel project**: `prj_KjaRFC7ASHwO7qlXHkhy3J13Iz7S`
- **GitHub repo**: `evantaylaz-cyber/altvest-subscriber-app` (public)
- **Supabase project**: Check Supabase MCP for current project ID
- **Build command**: `prisma generate && prisma db push --accept-data-loss && next build`

## Six Tools (Products)
| Tool | Min Tier | Price/Run | Deliverables |
|------|----------|-----------|-------------|
| Interview Outreach | Launch | $15 | Resume, outreach sequences, target mapping, networking playbook, 7-touch outreach sequence |
| Prospect Outreach | Launch | $15 | ICP mapping, multi-channel sequences, personalization, objection handling, 7-touch outreach sequence |
| Interview Prep | Pro | $12 | Qualification map, STAR stories, 30/60/90, discovery Qs, prep sheet, landscape app, 7-touch outreach sequence |
| Prospect Prep | Pro | $12 | Account research, discovery plan, competitive positioning, business case, landscape app, 7-touch outreach sequence |
| Deal Audit | Pro | $12 | Qualification scorecard, risk report, health card, strategy brief, landscape app |
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
- `POST /api/batch-requests` — Submit batch job (2-10 accounts, consumes N runs)
- `GET /api/batch-requests` — List user's batch jobs (with derived status from children)
- `GET /api/batch-requests/[batchId]` — Single batch job with progress, child statuses, synthesis data
- `PATCH /api/batch-requests/[batchId]/steps` — Update batch-level step progress
- `GET /api/knowledge-base` — List user's knowledge base documents
- `POST /api/knowledge-base` — Create knowledge base document
- `GET /api/knowledge-base/[id]` — Single knowledge base document
- `PATCH /api/knowledge-base/[id]` — Update knowledge base document
- `DELETE /api/knowledge-base/[id]` — Delete knowledge base document
- `GET /api/playbooks` — List playbook-eligible run requests grouped by company

## Execution Pipeline (per run)
```
submitted → [awaiting_clarification →] researching → generating → ready → delivered
```
Steps: competitive_research → market_intel → company_deep_dive → strategic_synthesis → generating_assets → [building_landscape_app] → [building_competitive_playbook] → [generating_outreach_sequence] → formatting → delivery

Research steps use Claude Sonnet 4.5 (standard) or Opus 4.6 (high-context tools).
Asset generation: PDFs via PDFKit, handwritten cards via Gemini, landscape via HTML generator, competitive playbook via PlaybookGenerator, outreach sequence via Claude + HTML viewer.
Delivery: styled email via Resend with asset links, then status → "delivered".
Pre-execution: sparse inputs trigger clarification questions (Haiku) + email to user.
Budget: BudgetGuardian tracks daily spend via `api_usage` table, alerts at 50/75/90%.
Retry: transient API errors (429/500/529) retry 3x with exponential backoff.
The PATCH endpoint accepts `x-api-key` header for worker auth (`INTERNAL_API_KEY` env var).

## Phase Status
- [x] Phase 1: Job queue + status tracking (COMPLETE, deployed)
- [x] Phase 2: Execution engine (single-account research + generation) — DEPLOYED on Railway
- [x] Phase 2.5a: Batch data model + API endpoints — DEPLOYED (commit 64146f3)
- [x] Phase 2.5b: Worker batch executor — DEPLOYED on Railway (commit f0a4cd7)
- [x] Phase 2.5c: Batch frontend (submission form, progress page, list integration) — DEPLOYED
- [x] Phase 2.5d: E2E tested 2026-03-02 — batch submission → worker processing → delivery confirmed
- [x] Phase 3: Outreach Sequence Generation — DEPLOYED (worker + app pushed 2026-03-03)
- [x] Phase 3.1: Seller Knowledge Base — BUILT (pending deploy, 2026-03-03)
- [x] Phase 3.2: Competitive Playbook — BUILT (pending deploy, 2026-03-03)
- [x] Phase 3.3: Outreach Personalization Layer ✅ BUILT 2026-03-03 (worker-only change — no app changes needed)
- [x] Phase 3.4: Gamma Deck Automation ✅ BUILT 2026-03-03 (GammaDeckGenerator class, new pipeline step, frontend asset+step. Requires GAMMA_API_KEY env var on Railway.)
- [x] Phase 4: Team Accounts ✅ BUILT 2026-03-05 (DB migration, API CRUD, team pages, invite email via Resend, invite acceptance page, team-scoped billing/runs/analytics)
- [x] Phase 4.1: Usage Analytics ✅ BUILT 2026-03-05 (API + dashboard with daily chart, tool breakdown, top companies, member usage, avg completion time)
- [x] Phase 4.2: Pipeline Speed Optimization ✅ BUILT 2026-03-05 (parallelization, Sonnet default, Haiku for low-stakes, token budget right-sizing)

### Outreach Sequence Status (as of 2026-03-03) — DEPLOYED
- Worker: `stepGenerateOutreachSequence` added to executor.js (lines 634-693)
- Prompt: `buildOutreachSequencePrompt` — 7-touch multi-channel (email, LinkedIn, phone) over 14-21 days
- Methodology: Orlob cold email formula + CotM narrative framing + multi-threading strategy
- HTML viewer: `buildOutreachSequenceHTML` — interactive timeline sidebar, detail panel, click-to-copy, objection handlers
- Raw data: outreach-sequence.json uploaded alongside HTML for programmatic access
- Eligible tools: prospect_outreach, interview_outreach, prospect_prep, interview_prep (OUTREACH_SEQUENCE_TOOLS constant)
- Pipeline integration: new step between building_landscape_app and formatting
- Delivery: `outreachSequence` and `outreachSequenceJson` labels added to email asset links
- Frontend: tools.ts updated — all 4 outreach-eligible tools include "Multi-Touch Outreach Sequence (7 touches, 14-21 days)" in deliverables
- Repos pushed: worker (altvest-worker) + app (altvest-subscriber-app) on 2026-03-03
- E2E verification: pending first live run

### Seller Knowledge Base Status (as of 2026-03-03) — BUILT, PENDING DEPLOY
- **Data model**: `KnowledgeDocument` table added to Prisma schema (id, userId, title, content, category, timestamps)
- **Categories**: product_docs, competitive_intel, deal_stories, icp_definitions, methodology, objection_handling, custom
- **Limits**: 50 docs per user, 50K chars per doc, 12K char injection cap per prompt
- **API routes**: GET/POST `/api/knowledge-base`, GET/PATCH/DELETE `/api/knowledge-base/[id]` — full CRUD with Clerk auth + ownership checks
- **Worker integration**: `loadKnowledgeBase(userId)` queries KnowledgeDocument table via Supabase JS; `buildUserContextPrefix()` expanded to inject KB docs under "SELLER KNOWLEDGE BASE" header with token budget cap
- **Frontend**: `/knowledge-base` page — search, category filter, create/edit/delete, document viewer panel
- **Navigation**: Dashboard nav + Profile page CTA both link to Knowledge Base
- **Repos**: Pending push — worker (altvest-worker) + app (altvest-subscriber-app)
- **E2E verification**: pending deploy + first live run

### Competitive Playbook Status (as of 2026-03-03) — BUILT, PENDING DEPLOY
- **Architecture**: No new DB model — playbook is a self-contained HTML asset stored in R2/S3, same pattern as landscape and outreach sequence
- **Worker**: New `PlaybookGenerator` class (`playbook-generator.js`) generates interactive HTML from `researchData.competitive`
- **Pipeline step**: `building_competitive_playbook` runs after `building_landscape_app`, before outreach sequence
- **Eligible tools**: Same as LANDSCAPE_TOOLS — interview_outreach, interview_prep, prospect_outreach, prospect_prep, champion_builder, competitor_research
- **HTML features**: React 18 + Tailwind. Per-competitor cards with expandable sections (CotM Deconstruction, Talk Track & Counter, Multi-Threading Play, Competitive Intel). Status Quo tab with cost-of-inaction breakdown. Discovery Question Bank with persona-specific Orlob questions. Search/filter by competitor name and threat level. Copy-to-clipboard on talk tracks.
- **Frontend**: `/playbooks` page — lists all playbook-eligible runs grouped by company. "Open Playbook" button links to HTML asset. Expandable per-company run history.
- **API**: `GET /api/playbooks` — queries RunRequests with competitive assets, groups by company, returns sorted
- **Asset mapping**: `competitivePlaybook` worker key → `competitive_playbook` template ID in normalize-assets.ts
- **Navigation**: Dashboard nav links to `/playbooks`, playbooks page has nav to Knowledge Base, Requests, Profile
- **Delivery email**: `competitivePlaybook` label added → "Competitive Playbook (Interactive)"
- **E2E verification**: pending deploy + first live run

### Batch Mode Status (as of 2026-03-02) — ALL COMPLETE
- BatchJob model + child RunRequest linkage: DONE
- POST /api/batch-requests (create batch, consume N runs, trigger worker): DONE
- GET /api/batch-requests (list with derived status from children aggregate): DONE
- GET /api/batch-requests/[batchId] (detail with derivedStatus, percentComplete, steps, synthesis): DONE
- /request/batch submission form (multi-account, shared context, run cost preview): DONE
- /batch/[batchId] progress page (status badges, clarification banner, per-account cards): DONE
- /requests page batch list integration (Your Input Needed badge, Review button): DONE
- Worker /execute-batch endpoint: DEPLOYED (batch-executor.js — parallel research, comparative synthesis, batch assets, QA, delivery)
- Worker health endpoint confirms batch queue: batchQueueLength + isBatchProcessing fields
- E2E test passed: 2-account batch submitted, worker processed, batch status "delivered", children "awaiting_clarification"
- Batch status derivation: children aggregate state takes priority over parent DB status
- Key fix: awaiting_clarification derived when ANY child is in that state
- Known MVP gap: batch scorecard is JSON (rendered by frontend), no PDF artifact yet

### Batch Pipeline (DEPLOYED — Phase 2.5b)
```
Phase A: Per-account research (parallel, concurrency 5) — reuses existing Executor per account
Phase B: Comparative synthesis (sequential via Claude, needs all Phase A complete)
Phase C: Per-account asset verification + Phase C2: Batch-level scorecard/insights
Phase D: QA pass
Phase E: Styled HTML email delivery via Resend (unified email with all accounts + rankings)
```
Batch-level deliverables: Account Prioritization Scorecard (JSON, frontend-rendered), synthesis data.
MVP gap: No batch-level PDF scorecard yet (Phase 3 item).
See PHASE_2_5_SPEC.md for full architecture.

## Known Gotchas
- Prisma `JsonArray` can't directly cast to custom types — must go through `unknown` first
- Vercel serverless timeout: 60s on Pro plan — worker MUST run on Railway
- GitHub's CodeMirror editor doesn't support Ctrl+H/F find-replace via keyboard shortcuts
- Build command includes `prisma db push --accept-data-loss` — be careful with schema changes
- RunRequest + User tables use camelCase columns (no Prisma `@@map`). user_profile uses snake_case (has `@@map`). Supabase JS queries must use actual DB column names.
- Assets bucket is PRIVATE. Worker uploads with service key, subscriber app proxies via `/api/assets/` with Clerk auth.
- `api_usage` table uses snake_case columns (created directly in Supabase, not via Prisma).
- Batch status must be DERIVED from children aggregate state, not read from parent BatchJob.status directly. Parent DB status can be stale.
- BATCH_STATUS_CONFIG and STATUS_CONFIG in requests/page.tsx must both include `awaiting_clarification` entry.

## Environment Variables (Vercel — subscriber app)
CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, DATABASE_URL, DIRECT_URL, RESEND_API_KEY, RESEND_FROM_EMAIL, INTERNAL_API_KEY, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, WORKER_WEBHOOK_URL, NEXT_PUBLIC_APP_URL, plus all Stripe price IDs (LAUNCH_MONTHLY_PRICE_ID, etc.)

## Environment Variables (Railway — worker)
ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, ALTVEST_APP_URL, INTERNAL_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, DAILY_SPEND_LIMIT, NOTIFICATION_EMAIL, TAVILY_API_KEY, PORT

## Worker Architecture
- **Repo**: `evantaylaz-cyber/altvest-worker`
- **Hosting**: Railway (`fa4c5482-3d40-482a-9da3-60fa5bbc01c6`)
- **Entrypoint**: `src/index.js` — Express server with /execute, /health, /status
- **Key files**: executor.js (pipeline + outreach sequence), budget-guardian.js (spend tracking), step-client.js (PATCH proxy), pdf-generator.js, gemini-cards.js, landscape-generator.js, playbook-generator.js (Phase 3.2)
- **Storage**: Supabase storage bucket "assets" (PRIVATE — accessed via service key)
- **Database tables used**: RunRequest, User, user_profile, KnowledgeDocument, api_usage

## Owner
- **Name**: Evan
- **Email**: evan.tay.laz@gmail.com
- **GitHub**: evantaylaz-cyber
