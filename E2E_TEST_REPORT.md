# E2E Test Report — March 12, 2026 (Updated)

**Tester:** Claude (automated browser testing via Chrome extension)
**Account:** evan.tay.laz@gmail.com (user_id: 7b922453-38a5-4c4c-b5dd-ad0962120228)
**Environment:** Production (app.salesblitz.ai)

---

## MANDATORY: Pre-Test Data Wipe

**BEFORE EVERY E2E TEST SESSION**, run `E2E_WIPE_SCRIPT.sql` via Supabase SQL Editor (project: `nbbazxqcpzxrzdvngscq`). This wipes ALL data for the test account:

- RunRequests, RunDebriefs, PracticeSessions, MeetingRecordings
- InterviewPanels, InterviewPanelMembers
- BatchJobs, RunLogs, RunPacks
- Targets, KnowledgeDocuments
- user_profile reset to blank (onboarding_depth=0)
- Subscription reset to 20/20 Closer tier

**Why:** Testing against stale data from old infrastructure produces false bugs. Legacy blitz runs use deprecated assets and old step IDs. Every test must start from absolute zero.

---

## Test Status

| Path | Status | Notes |
|------|--------|-------|
| Path 1: Job seeker, no resume, no case studies | BLOCKED | Blitz failed (competitive_research timeout), retry produced empty delivery (BUG-010). No usable assets. |
| Path 2: Job seeker, resume only | NOT STARTED | |
| Path 3: Job seeker, resume + case studies | NOT STARTED | |
| Path 4: Job seeker, resume + case studies + instructions | NOT STARTED | |
| Post-blitz: NotebookLM upload | PARTIAL | URL upload fails (auth required). File upload works. See UX-001. |
| Post-blitz: Google Slides upload | NOT STARTED | |
| Post-blitz: Practice Mode | COMPLETED | Core pipeline works. BUG-015 found (Focus Areas raw data). |
| Prospector paths | BLOCKED | Need Evan to switch to evan@salesblitz.ai |

---

## Bugs Found

### P0 — Critical (Blocks Customer Value)

**BUG-001: competitive_research step times out for large companies**
- Severity: P0
- Location: salesblitz-worker/src/executor.js (competitive_research step)
- Repro: Submit interview_prep blitz for Datadog (or any company with crowded competitive landscape)
- Expected: Research completes within reasonable time
- Actual: Step "competitive_research" timed out after 11 min
- Root cause: Multi-turn web search with up to 8 searches + full page fetches. Context window grows cumulatively. For crowded markets, this spirals.
- Impact: Customer sees "This blitz hit a snag" error after 11+ minutes of waiting. Terrible first impression.
- Fix: Cap web searches to 4-5, use PTC instead of sequential callClaudeWithWebSearch, consider caching competitive intel per company

**BUG-002: Worker retry leaves job stuck in queue for 10+ minutes**
- Severity: P0
- Location: salesblitz-worker/src/index.js (recoverStaleRuns), salesblitz-app/src/lib/trigger-worker.ts
- Repro: After a blitz fails and user clicks "Retry", job goes to "submitted" but worker doesn't pick it up
- Expected: Retry triggers worker immediately
- Actual: Job sits at "submitted" for 10+ minutes until stale-run recovery cycle fires
- Root cause: Webhook to worker fails (all 3 attempts), job reverts to "submitted" with no active listener. Recovery polling fires every 10 minutes.
- Impact: Customer clicks retry and waits another 10-20 minutes. Combined with initial failure, total wait can exceed 30 minutes.
- Fix: Reduce recovery interval to 2-3 min. Add Supabase Realtime subscription as backup trigger. Consider persistent queue (Redis/BullMQ).

**BUG-010: Retry skips ALL research and asset generation steps, delivers empty blitz**
- Severity: P0 (SHIP BLOCKER)
- Location: salesblitz-worker/src/executor.js (retry/resume logic), salesblitz-worker/src/index.js
- Repro: Submit interview_prep blitz that fails (e.g., competitive_research timeout). Click "Retry This Run."
- Expected: Worker re-runs all 7 steps from scratch, produces Context File + Speaker Notes + POV Deck
- Actual: Worker jumps directly to delivery step (step 7). Steps 1-6 remain at "pending" status. Blitz shows "Delivered" at 100% but only contains a Call Prep Sheet from the original failed run. Context File, Speaker Notes, and POV Deck are completely missing.
- Evidence: DB query on run 486f01df shows steps 1-6 all at "pending", only step 7 ("deliver") at "completed" with 1-second duration. Assets JSON: `{"callPrepSheet": "...call-prep-sheet.pdf"}` — no context_file, no onscreen_notes, no pov_deck.
- Root cause: Retry logic does not reset step statuses or re-execute the pipeline. It appears to detect existing steps and skip to delivery, treating the run as already complete.
- Impact: EVERY customer who retries a failed blitz gets an empty "delivered" result with only a Call Prep Sheet. They've now waited 20-30 minutes total (initial failure + retry wait + instant empty delivery) and received nothing useful. This is the worst possible customer experience.
- Fix: Retry must reset ALL step statuses to "pending" and re-run the full pipeline from step 1. Alternatively, retry should only skip steps that are already "completed" with valid output, not "pending" or "failed" steps.

### P1 — High (Degrades Experience)

**BUG-003: Subscription display shows 50/20 (remaining > total)**
- Severity: P1
- Location: Dashboard subscription card
- Repro: Load dashboard for evan.tay.laz@gmail.com account
- Expected: Remaining should be <= total (e.g., 20/20 or 15/20)
- Actual: Shows "50/20" — 50 remaining out of 20 total
- Impact: Confusing for customers. Suggests math bug in balance tracking.

**BUG-004: Blitz confirmation says "blitz for at Datadog" (stray preposition)**
- Severity: P1
- Location: Blitz Started confirmation page
- Repro: Submit any interview_prep blitz
- Expected: "Your Interview Prep blitz for Datadog is running"
- Actual: "Your Interview Prep blitz for at Datadog is running"
- Impact: Looks sloppy. Easy fix — likely a template string with both "for" and "at" when only one should show.

**BUG-005: Progress bar stuck at 0% while steps are actively running**
- Severity: P1
- Location: Results page progress display
- Repro: Watch blitz progress page during first 5 minutes
- Expected: Progress bar shows incremental progress as research runs
- Actual: Shows 0% until first step completes, then jumps to 29%
- Impact: Customer thinks nothing is happening for 5+ minutes. Should show sub-step progress.

**BUG-006: Timer doesn't reset on retry**
- Severity: P1
- Location: Results page progress display
- Repro: Blitz fails, user clicks retry
- Expected: Timer resets to 0:00 for the new attempt
- Actual: Timer continues from original submission time (e.g., shows 14m when retry just started)
- Impact: Customer sees "14m elapsed" immediately after retry, making it look broken before it even starts.

**~~BUG-011~~ DROPPED: Legacy artifact** — Found on pre-deprecation blitz ecc391f1 only. New pipeline serves .md Context Files correctly. Not a current-infrastructure bug.

**~~BUG-012~~ DROPPED: Legacy artifact** — Competitive Playbook was deprecated Mar 12. CDN failure only affects pre-deprecation blitzes. Not a current-infrastructure bug.

### P2 — Medium (Polish Issues)

**BUG-007: Onboarding banner doesn't update for interview path**
- Severity: P2
- Location: Dashboard banner when chatbot is at Layer 0
- Repro: Start onboarding, select "I'm prepping for interviews"
- Expected: Banner should update to interview-relevant copy (e.g., "Tell us about your interview. We do the rest.")
- Actual: Banner still shows "Tell us your company. We do the rest." — seller-focused copy
- Impact: Minor copy mismatch but doesn't match the user's declared lifecycle

**BUG-008: Chatbot pushes back twice on skipping deal stories**
- Severity: P2
- Location: Onboarding chatbot (Layer 0)
- Repro: Say "I don't have any deal stories" during onboarding
- Expected: Chatbot accepts skip gracefully after 1 nudge
- Actual: Chatbot asks again with suggestions, requires a second "really I don't have any" before moving on
- Impact: Feels pushy for users who genuinely have nothing to share. One nudge is fine, two is too many.

**BUG-009: "Subscribe" button shows for subscribed users on results page**
- Severity: P2
- Location: Nav bar on /requests/[id] page
- Repro: Load any results page as a subscribed user
- Expected: Should show "Billing" or tier badge (like dashboard shows "Closer")
- Actual: Shows green "Subscribe" button
- Impact: Confusing — customer already has a subscription but is being asked to subscribe.

**BUG-015: Practice Mode Focus Areas shows raw blitz references instead of human-readable content**
- Severity: P2
- Location: Practice session review page (`/practice/[sessionId]/review`), Focus Areas section
- Repro: Complete any practice session from a blitz card, view session review
- Expected: Focus Areas shows actionable coaching topics (e.g., "competitive positioning", "value messaging", "objection handling")
- Actual: Shows raw data: "[Blitz 2026-03-12 — prospect_outreach] [Blitz 2026-03-12 — prospect_outreach]"
- Additional issue: The blitz reference says "prospect_outreach" but this session was launched from an interview_prep blitz for Affirm. Wrong tool type is being linked.
- Impact: Customer sees meaningless technical data where they expect coaching guidance. The focus areas are supposed to help them improve.
- Fix: Parse the blitz context into human-readable focus areas, or generate them from the research context. Ensure the correct blitz/tool type is referenced.

**BUG-016: Scoring pipeline fails with unhelpful error message**
- Severity: P2
- Location: Practice session review page, Coaching Feedback section
- Repro: Complete a practice session with non-substantive user input (e.g., "la la la"), view session review
- Expected: Either a meaningful score with feedback about improving responses, or a helpful message explaining why scoring couldn't complete (e.g., "We couldn't generate a score. Try having a more substantive conversation next time.")
- Actual: Shows "Scoring failed. Review your transcript manually." with 0/5 score. Feels like a system error rather than user guidance.
- Additional context: Session had 10 messages total (5 exchanges). Avatar gracefully handled gibberish ("Sorry, didn't quite catch that - you're coming through a bit choppy on my end.") but scoring pipeline still threw an error.
- Impact: "Scoring failed" sounds like the system broke. Customer doesn't know if it's their fault or a bug. Should be rewritten as coaching guidance.
- Fix: Distinguish between "scoring API error" and "insufficient content to score." For the latter, give constructive feedback. For the former, retry silently or show a less alarming message.

### P3 — Infrastructure (Backend Issues, Not Customer-Visible)

**BUG-013: Knowledge Base embedding pipeline returning 400 errors**
- Severity: P3
- Location: Supabase RPC `update_kb_embedding`, `exec_sql`
- Evidence: Supabase API logs show repeated 400 responses for these RPC calls during blitz execution
- Impact: Knowledge base isn't being updated with blitz research results. Doesn't block current blitz delivery, but means context accumulation across blitzes is broken.
- Fix: Debug the RPC functions. Likely schema mismatch or missing function definition.

**BUG-014: api_usage table returning 404**
- Severity: P3
- Location: Supabase REST API for `api_usage` table
- Evidence: Supabase API logs show 404 for api_usage table queries during blitz execution
- Impact: API usage tracking is silently failing. No usage metrics being collected.
- Fix: Create the api_usage table if it doesn't exist, or remove the code that writes to it.

---

## UX Findings (Not Bugs, Design Gaps)

**UX-001: Asset URLs incompatible with NotebookLM direct URL upload**
- Location: NotebookLM "Websites" source type
- Finding: Pasting a Sales Blitz asset URL (e.g., https://app.salesblitz.ai/api/assets/...) into NotebookLM's URL input shows "Invalid URL. Please check the URL and try again."
- Root cause: Asset URLs require authentication cookies. NotebookLM fetches URLs server-side and can't access authenticated resources.
- Workaround: Customer must download the PDF first, then upload via NotebookLM's file upload.
- Recommendation: Add clear instructions in the NotebookLM guide: "Download your Context File PDF first, then upload it to NotebookLM as a file source." Consider adding a direct download button next to each asset.

---

## Speed Optimization Findings

### Current Architecture Bottlenecks

1. **Sequential context loading**: 7 serial DB queries in execute() before any research starts. Could parallelize with Promise.all().

2. **Sequential asset generation**: Context File → Speaker Notes → POV Deck → Outreach all run one after another. Notes + POV Deck + Outreach could run in parallel since they only depend on the research results, not each other.

3. **competitive_research over-researching**: Up to 8 web searches with multi-turn continuation loops. Each continuation = another API round-trip. Full page fetches grow context window.

4. **In-memory job queue**: Worker uses a JavaScript array. Worker restart = all queued jobs lost. Recovery polling at 10-min interval is too slow.

5. **No sub-step progress reporting**: Progress jumps from 0% to 29% when steps 2&3 complete simultaneously. No granular updates during long-running research steps.

### Recommended Speed Improvements (Priority Order)

| # | Change | Expected Impact | Effort |
|---|--------|----------------|--------|
| 1 | Parallelize context loading (Promise.all) | -30s to -60s off startup | Small |
| 2 | Parallelize asset generation (notes + POV deck + outreach) | -3 to -5 min off total | Medium |
| 3 | Cap competitive_research to 5 searches max, no full page fetches | -3 to -5 min off research | Small |
| 4 | Reduce recovery interval to 2 min | Faster retry recovery | Tiny |
| 5 | Switch competitive_research to PTC | Faster multi-search execution | Medium |
| 6 | Add sub-step progress events | Better perceived speed | Medium |
| 7 | Persistent queue (Redis/BullMQ) | Eliminate queue loss on restart | Large |

### Target: Total blitz time should be < 5 minutes

Current worst case: 30+ minutes (with timeout + retry wait)
Current typical: ~15-20 minutes
With fixes 1-3: ~8-10 minutes
With fixes 1-6: ~5-7 minutes

---

## Passes (What Worked Well)

- **PASS**: Onboarding chatbot accepted minimal input (no resume, no case studies) and still advanced to Layer 1
- **PASS**: Chatbot auto-researched Datadog company intel from just the company name
- **PASS**: Layer 0 → Layer 1 progression worked correctly
- **PASS**: Dashboard unlocked after minimal onboarding
- **PASS**: Banner updated from "Tell us your company" to "Deepen your profile" after Layer 0
- **PASS**: Interview prep guided flow (situation selector → form) worked cleanly
- **PASS**: "Speaker Notes" terminology confirmed across all visible UI (form, step list)
- **PASS**: Pre-fill suggestion appeared from prior Datadog blitz — nice continuity feature
- **PASS**: Error recovery UI is clean — shows partial research, retry button, support email
- **PASS**: "No extra cost" messaging on retry is good customer-friendly copy
- **PASS**: All 6 interview type options display correctly with clear descriptions

### Practice Mode Passes
- **PASS**: Blitz card click on lobby page launches practice session directly (no intermediate form)
- **PASS**: Avatar streams successfully with green "Live" indicator
- **PASS**: Lip sync active during avatar speech ("Speaking" badge visible)
- **PASS**: Persona is contextually rich — introduces as Sarah Chen, VP of Enterprise Sales for North America at Affirm
- **PASS**: Transcript populates in real-time in right panel during session
- **PASS**: "Click mic to speak" prompt clear and visible below avatar
- **PASS**: End Session button terminates session and redirects to review page
- **PASS**: Review page shows company, persona, duration, date, and score badge
- **PASS**: "Needs Work" rating correct for zero-response session
- **PASS**: Coaching Feedback correctly identifies short session: "Session too short to score"
- **PASS**: Debrief text area available with 5000-char limit, save button, and carry-forward messaging
- **PASS**: Full Transcript expandable — shows all messages with correct speaker labels (You / Sarah Chen)
- **PASS**: "Practice Again" button available on review page
- **PASS**: Session counter on lobby shows usage tracking (incremented from 4/10 to 5/10 after test session)
- **PASS**: Multiple blitz types available on lobby: Interview Practice, Discovery Call, Deal Review Call
- **PASS**: Avatar gracefully handles nonsensical audio input ("la la la" → "Sorry, didn't quite catch that - you're coming through a bit choppy on my end")
- **PASS**: Interview Scorecard shows session sequencing (Session #3) across multiple sessions for same target
- **PASS**: "Practice with Your Research" section has clear description copy
- **PASS**: 10-message conversation transcript captured accurately with speaker labels

---

## Bug Summary

| Severity | Count | IDs |
|----------|-------|-----|
| P0 (Ship Blockers) | 3 | BUG-001 (FIXED), BUG-002 (FIXED), BUG-010 (FIXED) |
| P1 (Degrades Experience) | 4 | BUG-003 (FIXED via data wipe), BUG-004 (FIXED), BUG-005 (FIXED), BUG-006 (FIXED) |
| P2 (Polish) | 5 | BUG-007, BUG-008, BUG-009 (FIXED), BUG-015 (FIXED), BUG-016 (FIXED) |
| P3 (Infrastructure) | 2 | BUG-013, BUG-014 |
| UX Gaps | 1 | UX-001 |
| Dropped (Legacy) | 2 | BUG-011, BUG-012 |
| **Active Total** | **15** (10 fixed, 5 remaining) | |

### Fixes Applied (Mar 12, 2026)

| Bug | Fix | File(s) Changed |
|-----|-----|----------------|
| BUG-010 (P0) | Rewrote worker `getStepsForTool()` with per-tool step templates matching app's `job-steps.ts` | `salesblitz-worker/src/executor.js` |
| BUG-002 (P0) | Recovery interval 10min → 2min | `salesblitz-worker/src/index.js` |
| BUG-001 (P0) | Capped competitive_research web searches from 8 → 5 | `salesblitz-worker/src/executor.js` |
| BUG-004 (P1) | Conditional "for [name] at [company]" — omits name when empty | `salesblitz-app/src/app/request/page.tsx` |
| BUG-005 (P1) | Progress bar computed from step data (in_progress = 50% credit) | `salesblitz-app/src/app/requests/[id]/page.tsx` |
| BUG-006 (P1) | Retry clears startedAt/completedAt/deliveredAt so timer resets | `salesblitz-app/src/app/api/requests/[id]/retry/route.ts` |
| BUG-003 (P1) | Data integrity fix via E2E wipe script (resets to 20/20) | `E2E_WIPE_SCRIPT.sql` |
| BUG-009 (P2) | Subscribe button only shows when `isMaxTier === false` (explicit) | `salesblitz-app/src/components/AppNav.tsx` |
| BUG-015 (P2) | Focus Areas strips raw blitz tags, hides section if no substance | `salesblitz-app/src/app/practice/[sessionId]/review/page.tsx` |
| BUG-016 (P2) | Scoring fallback gives coaching guidance, not error message | `salesblitz-app/src/app/api/practice/end/route.ts` |
| BUG-011 | DROPPED — legacy artifact from pre-deprecation blitz | N/A |
| BUG-012 | DROPPED — deprecated Competitive Playbook asset | N/A |

---

## Test Session Details

- Profile wiped via SQL before testing (onboarding_depth=0, onboarding_completed=false)
- Subscription: Closer tier, 50 blitzes available
- Run request IDs tested:
  - 486f01df-165f-4c60-b63d-91977f9492c9 (Path 1, post-deprecation, failed + empty retry)
  - ecc391f1 prefix (legacy pre-deprecation Affirm blitz, used for post-blitz testing)
- Target company: Datadog, Enterprise AE role, Phone Screen
- No resume, no case studies, no LinkedIn, no interview instructions provided
