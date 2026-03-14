# E2E Test Session State — Mar 14, 2026

## Session Purpose
Full E2E testing of Sales Blitz customer journey across both accounts.

---

## Accounts Under Test

| Account | Email | User ID | Persona | Status |
|---------|-------|---------|---------|--------|
| Gmail (job seeker) | evan.tay.laz@gmail.com | 7b922453 | Career transition / interviewing | COMPLETE |
| Salesblitz (seller) | evan@salesblitz.ai | c517da4b | Prospecting / selling | COMPLETE |

---

## Completed Tests

### 1. Interview Prep Blitz (Gmail account, Affirm)
- **Request ID:** 2d3f1513-e3be-4b57-82d5-443b0e26657d
- **Status:** Delivered in 7m 19s, all 7 steps completed
- **Assets:** Context File (31,829 chars), Speaker Notes (6,024 chars), POV Deck (98KB)
- **Quality Grade:** B+/A-
- **Research depth:** Strong. Specific Affirm financials, correct competitors, story bank maps Evan's CBRE deal
- **Speaker Notes:** Solid per-interviewer structure (CCO, VP Sales, Peer), slightly thin for final round
- **Delivery Page UI:** Very polished. All sections render correctly.

### 2. Prospect Prep Blitz (Salesblitz account, Cognisen)
- **Request ID:** 57007143-370e-4a42-937e-c2ed494725f0
- **Status:** Delivered in 6m 32s, all 7 steps completed
- **Assets:** Context File, Speaker Notes, POV Deck (5 slides)
- **Quality Grade:** A-
- **Research depth:** Deep research into criminal justice B2G SaaS space, correct competitors (Tyler Technologies, Offender360, AWARE, Equivant)
- **Clarification flow:** Worker detected low confidence (58%), asked 3 clarifying questions before proceeding. Good UX.
- **NotebookLM integration:** 9 personalized prompts across all Studio formats, each with Copy button. Grade: A.

### 3. AI Chatbot Quality (Salesblitz account)
- **Quality Grade:** B+
- **Research tool:** Correctly identified Sales Blitz product and market via `research_company` tool
- **Response:** Accurate and conversational
- **Bug found:** Markdown rendering (see bug #8)
- **Onboarding state:** Layer 3/4 completed

### 4. Practice Mode (Salesblitz account)
- **Quality Grade:** A
- **Scenarios:** 8 research-powered practice scenarios auto-generated from completed blitz outputs
- **LiveAvatar:** Loaded with male avatar, persona was in-character as Mike Sullivan (busy VP of Sales)
- **Session review:** Correctly detected short session (<4 exchanges), showed "Session too short to score" with debrief text area

### 5. Profile Lifecycle Toggle (Salesblitz account)
- **Result:** PASS
- **Flow:** Selling -> Interviewing -> Save -> Dashboard updated to interview-first layout with correct subtitle ("Prep for your next role. Every round, every interviewer.") and 2-column hero CTAs with "Prep for an interview" first -> Switched back to Selling -> Dashboard reverted
- **Persistence:** Confirmed via page reload
- **Location:** Profile > Career & Territory > "Where are you right now?" dropdown

### 6. NotebookLM Integration (Salesblitz account, Cognisen delivery page)
- **Quality Grade:** A
- **Structure:** 3-step flow (Upload sources, Supercharge with more sources, Generate study materials)
- **Prompts:** 9 unique prompts across Podcast, Slide Deck, Video, Report, Infographic, Data Table, Mind Map, Flashcards, Quiz
- **Personalization:** Target company and contact name (Mike Sullivan) used in prompts
- **Copy buttons:** Working. Each prompt has navigation path instructions.
- **Deep Research queries:** 3 ready-to-paste queries with descriptions

### 7. Browser Extension Page
- **Quality Grade:** B+ (page only, no functional test)
- **Page UX:** Well-structured 6-step setup guide, consent flow with 3 checkboxes, feature cards (AI transcript, meeting analysis, coaching feedback, outcome assessment, context for next blitz)
- **Supported platforms:** Google Meet, Zoom (web client), Microsoft Teams (web client) -- all "Full support"
- **Note:** Cannot install/test actual extension from this environment

### 8. Team Accounts (Salesblitz account)
- **Result:** PASS
- **Flow:** Empty state -> Create team ("E2E Test Team") -> Team detail page with Plan/Runs/Seats cards, Invite Member section, Members list
- **Team ID:** 100e38c7-7371-459c-9018-23651c40a9e2
- **Observations:** No team name header on detail page (P3). 1/5 seats used, 0/0 runs (no team plan).

### 9. Targets Page (Territory Intelligence)
- **Quality Grade:** A-
- **Stats:** 4 Active Targets, 8 Total Blitzes, 2 Practice Sessions
- **Targets:** Cognisen (Mike Sullivan, Tom Westfall), Radiant Logic (Tre Menzel), Plaid (Sarah Chen)
- **Features:** Filter tabs (All/Prospects/Interviews), intelligence depth badges (Light R2/R3/R6), linked blitz cards
- **Bug:** Timeline tags all show "prospect_outreach" regardless of actual tool type (see bug #12)

### 10. Analytics Page
- **Quality Grade:** A-
- **KPIs:** 8 Total Runs, 19m Avg Completion, 100% Success Rate, 3 Companies Researched
- **Charts:** Daily Usage bar chart, Blitzes by Tool breakdown, Top Target Companies leaderboard
- **Period selectors:** 7d, 30d, 90d
- **Bug:** Tool names show snake_case IDs instead of display names (see bug #11)

### 11. Playbooks Page
- **Quality Grade:** N/A (empty state)
- **Observation:** 0 playbooks despite 8 completed blitzes. Either playbook generation is a separate process not yet triggered, or there's a feature gap. (see bug #13)

---

## Bugs Found (Cumulative)

| # | Severity | Description | Status | Fix Location |
|---|----------|-------------|--------|-------------|
| 1 | P0 | meetingDate Prisma validation: date-only string rejected | FIXED & DEPLOYED | `src/app/api/requests/route.ts` line 213, `src/app/api/batch-requests/route.ts` line 182 |
| 2 | P1 | consumeRun() not transactional with runRequest.create() -- runs lost on failures | FIXED (awaiting deploy) | `src/app/api/requests/route.ts` (transaction wrapping), `src/app/api/batch-requests/route.ts` (same) |
| 3 | P2 | `.md` missing from CONTENT_TYPES in asset proxy -- markdown files served as octet-stream | FIXED (awaiting deploy) | `src/app/api/assets/[...path]/route.ts` |
| 4 | P2 | Form submission error message invisible when user scrolled to bottom | UNFIXED | `src/app/request/page.tsx` |
| 5 | P2 | `[audit-log] Failed to write: 404 Not Found` on most requests | UNFIXED | Unknown -- need to find audit-log route |
| 6 | P2 | Steps completing out of order in progress UI (step 6 before steps 4-5) | UNFIXED | Likely executor/worker ordering issue |
| 7 | P2 | No lifecycle toggle visible without expanding Career & Territory section | OBSERVATION | Profile page UX -- toggle is buried, not prominent |
| 8 | P3 | Chatbot markdown rendering -- `**bold**` shows raw asterisks instead of bold | UNFIXED | Chat renderer component needs markdown parsing |
| 9 | P3 | Team detail page missing team name header | UNFIXED | `src/app/teams/[id]/page.tsx` |
| 10 | P3 | Cognisen blitz timeline tags show "prospect_outreach" for all tools | UNFIXED | Targets page timeline label logic |
| 11 | P3 | Analytics "Blitzes by Tool" shows snake_case IDs (deal_playbook, proposal_blitz) instead of display names | UNFIXED | Analytics page tool name mapping |
| 12 | P3 | Playbooks page shows 0 playbooks despite 8 completed blitzes | INVESTIGATE | Playbook generation pipeline may not be wired up |

**Summary:** 1 P0 (fixed), 1 P1 (fixed), 5 P2 (2 fixed, 3 unfixed), 5 P3 (all unfixed)

---

## Data Cleanup Done
- Restored 7 wasted subscription runs (SET subscriptionRunsRemaining = 13)
- Deleted 7 phantom RunLog entries from failed submissions
- Reset Target roundCount from 7 to 1
- Created test team "E2E Test Team" (100e38c7-7371-459c-9018-23651c40a9e2) -- can be deleted after testing

---

## Code Changes Made This Session (Awaiting Commit)

1. `src/app/api/requests/route.ts` -- meetingDate fix: `new Date(meetingDate)` (DEPLOYED), transactional wrapping of consumeRun + request creation (DEPLOYED)
2. `src/app/api/batch-requests/route.ts` -- meetingDate fix (DEPLOYED), transactional wrapping of consumeRun + BatchJob + child RunRequests with `prisma.$transaction()` and 30s timeout (AWAITING DEPLOY)
3. `src/app/api/assets/[...path]/route.ts` -- added .md/.txt/.csv to CONTENT_TYPES and inline display list (AWAITING DEPLOY)

---

## Roadmap Items Identified

### Modular Context File Architecture (P1)
Customer blitz outputs use monolithic single-file .md. Internal context files use modular multi-file architecture.
**Recommendation:** Generate modularly, deliver as one. Add navigation map to context files. Build optional "View as Components" on delivery page. Reuse competitive landscape across tools on same target.

### Playbook Auto-Generation (P2)
Playbooks page exists with good empty state UX but no playbooks are being generated from completed blitzes. Need to investigate whether the generation pipeline is wired up or if this is a planned feature.

### Tool Name Display Mapping (P3)
Multiple pages (Analytics, Targets timeline) display raw tool IDs (snake_case) instead of human-readable names. A shared `toolDisplayName()` utility would fix this everywhere.

---

## Overall Assessment

| Area | Grade | Notes |
|------|-------|-------|
| Interview Prep Blitz | B+/A- | Strong research, good speaker notes, polished delivery |
| Prospect Prep Blitz | A- | Deep B2G research, correct competitors, clarification flow works well |
| AI Chatbot | B+ | Accurate research, good conversational tone, markdown rendering bug |
| Practice Mode | A | In-character persona, short session detection, 8 auto-generated scenarios |
| Lifecycle Toggle | A | Clean round-trip, dashboard updates correctly |
| NotebookLM Integration | A | 9 personalized prompts, excellent 3-step flow |
| Extensions Page | B+ | Well-structured, can't test actual extension |
| Team Accounts | B+ | Creation works, invite flow present, missing team name header |
| Targets (Territory Intelligence) | A- | Great CRM-like view, minor tool name display bug |
| Analytics | A- | Good KPIs and charts, tool name display bug |
| Playbooks | Incomplete | No playbooks generated despite 8 blitzes |
| **Overall App Quality** | **B+/A-** | Core blitz pipeline is solid. Research quality is the standout feature. Main gaps are cosmetic display bugs and the playbooks pipeline. |
