# Sales Blitz Product Quality Audit

**Date:** 2026-03-07
**Auditor:** Claude (directed by Evan)
**Standard:** "Would an Apple product exec ship this?"
**Scope:** Every user-facing page, API route, form, and piece of copy in the app

---

## Severity Key

- **P0 — Broken/Unusable**: Feature doesn't work as intended or actively degrades the experience
- **P1 — Major Gap**: Missing functionality that directly impacts product quality or context depth
- **P2 — Design Debt**: Functional but below the Apple-level standard; needs polish
- **P3 — Enhancement**: Would meaningfully improve the product but not blocking

---

## 1. PRACTICE MODE (Practice Lobby, Live Session, Review)

### P0: Blitz card click doesn't launch session directly
**File:** `practice/page.tsx` line 118-125 (`selectBlitz()`)
**Problem:** `selectBlitz(run)` only sets form state (runRequestId, targetCompany, meetingType). User still has to scroll up and click "Start Practice." This is the exact issue Evan flagged. The blitz card should launch a session in one click.
**Fix:** Add a "Practice Now" button per card that calls `/api/practice/start` directly and routes to the session page. No intermediate form.

### P0: Review page fetches session data from history list, not a dedicated endpoint
**File:** `practice/[sessionId]/review/page.tsx` line 79-91
**Problem:** `fetchSession()` calls `/api/practice/history?limit=50` then loops through results to find the matching session. This means: (a) if the session is older than 50 sessions, it won't load, (b) it doesn't return the full transcript (history endpoint uses `select` that may not include it), (c) it's an N+1 pattern. Should be a dedicated `GET /api/practice/[sessionId]` endpoint.
**Fix:** Create `/api/practice/[sessionId]/route.ts` that returns full session data including transcript.

### P1: Practice start API only uses 4 profile fields
**File:** `api/practice/start/route.ts` lines 58-63
**Problem:** Seller context is built from only `companyName`, `companyProduct`, `companyDifferentiators`, `companyTargetMarket`. The persona prompt never sees: deal stories, selling style, value props, career context, ICP definitions, competitors, LinkedIn data, methodology. The result: generic personas that don't mirror the user's real selling motion.
**Fix:** Load full UserProfile and inject relevant fields into persona generation prompt. At minimum add: companyCompetitors, valueProps, sellingStyle, dealStories.

### P1: Research data truncated to 8K chars
**File:** `api/practice/start/route.ts` line 53
**Problem:** `researchContext = researchData.slice(0, 8000)`. Blitz research can be 15-30K characters. Cutting at 8K loses competitive analysis, stakeholder mapping, and detailed company intel. The persona is built from partial context.
**Fix:** Use Claude to extract the most relevant sections rather than hard-truncating. Or at minimum, increase to 15K and prioritize the persona-relevant sections.

### P1: No "Practice Again" with context on review page
**File:** `practice/[sessionId]/review/page.tsx` line 131-136
**Problem:** The "Practice Again" button just links to `/practice` (the lobby). It doesn't carry the target company, runRequestId, or any coaching context from this session forward. The next session starts from zero.
**Fix:** Button should link to `/practice?company=X&runRequestId=Y&previousSession=Z` so the next session knows what came before.

### P1: No debrief capture on review page
**File:** `practice/[sessionId]/review/page.tsx`
**Problem:** After seeing their score and feedback, the user has no way to add their own notes, reflections, or what they want to work on next time. This is the critical feedback loop for the "learning flywheel" (Phase 5 of the plan).
**Fix:** Add a textarea for user notes/debrief. Save to PracticeSession or a linked RunDebrief record.

### P1: Message route doesn't build on accumulated context
**File:** `api/practice/message/route.ts`
**Problem:** The message route loads the session's `personaConfig` but nothing about prior sessions for the same target. If someone practices CBRE three times, the third session's persona doesn't know what happened in the first two.
**Fix:** Phase 5 addresses this. Blocked on Target entity usage.

### P1: Session end doesn't update Target intelligence
**File:** `api/practice/end/route.ts`
**Problem:** After scoring, the results are saved to PracticeSession but nothing flows back to the Target entity. `accumulatedIntel` never gets updated. Each practice session is an island.
**Fix:** After scoring, synthesize key coaching points and append to Target.accumulatedIntel. Phase 5 addresses this.

### P2: Female avatar ID unverified
**File:** `practice/[sessionId]/page.tsx` line 182
**Problem:** `FEMALE_AVATAR = "b4fc2d60-3b82-4694-b243-93e9d2bb0242"` was set but never tested in production. If the ID is wrong, female personas get no avatar or a crash.
**Fix:** Run a test session with a female persona name. Verify avatar loads.

### P2: Chroma key untested with real avatar
**File:** `practice/[sessionId]/page.tsx` lines 107-152
**Problem:** The green-screen removal algorithm was written but never tested with actual HeyGen avatar output. The threshold values (g > 100, g > r * 1.4, g > b * 1.4) may not match HeyGen's actual green screen color.
**Fix:** Run a session, screenshot the avatar, verify chroma key removes green without artifacts.

### P2: Gender detection uses hardcoded name list
**File:** `practice/[sessionId]/page.tsx` line 184
**Problem:** ~50 hardcoded female names. Any persona with an uncommon female name (Priya, Akiko, Fatima) defaults to male avatar. This is both a quality and inclusivity issue.
**Fix:** Have the persona generation API return a `gender` field and pass it through, rather than guessing from name.

### P2: No panel mode speaker indicator
**File:** `practice/[sessionId]/page.tsx`
**Problem:** When panel mode ships, there's no UI to show which interviewer is currently speaking. The transcript also doesn't tag per-speaker. Needs design before Phase 4.
**Fix:** Phase 4 addresses this. Add a speaker badge above the avatar and tag transcript entries with speaker name/title.

### P2: Scoring prompt doesn't adapt to meeting type
**File:** `lib/practice.ts` lines 167-213 (`buildScoringPrompt`)
**Problem:** The scoring prompt always evaluates against sales-specific CotM dimensions (Before State, Cost of Inaction, Required Capabilities, etc.) regardless of meeting type. For an interview session, these dimensions don't apply. An interview should be scored on: answer depth, story structure, company knowledge, question quality, cultural fit.
**Fix:** Build a separate scoring prompt for interview sessions. Or parameterize the existing one based on `_meetingType`.

### P3: Timer doesn't pause when avatar speaks
**File:** `practice/[sessionId]/page.tsx` line 56 (`elapsed`)
**Problem:** The elapsed timer counts total wall-clock time, not actual user-speaking time. A 5-minute session where the avatar talked for 3 minutes shows 5:00, making it seem like the user talked more than they did.
**Fix:** Track user speaking time separately. Display both total and user-talk-time.

---

## 2. BLITZ SUBMISSION (Request Form)

### P1: No panel composition fields for interview_prep
**File:** `request/page.tsx`
**Problem:** The form collects: name, company, role, LinkedIn, JD, interview instructions, meeting type (mock_pitch | hiring_manager). But NO fields for: number of interviewers, panelist names/titles/roles, personality vibes, round type (phone_screen | panel | final), round number, interview assignment/case study upload.
**This is the biggest context gap in the pipeline.** The practice persona is generated from a single-interviewer model even when the user is prepping for a 3-person panel.
**Fix:** Phase 2 of the plan adds PanelCompositionSection. Progressive disclosure: appears for interview_prep only, starts collapsed, "How many interviewers?" triggers expansion.

### P1: No document upload anywhere
**File:** `request/page.tsx`
**Problem:** Users can paste text but can't upload files. For interview prep: resumes, assignments, case study PDFs, JD files. For prospect prep: case study PDFs, pitch decks, product sheets. Text-only input loses formatting, charts, and multi-page documents.
**Fix:** Add file upload with client-side parsing (PDF-to-text) or server-side extraction. At minimum for interview_prep: resume upload + assignment upload.

### P1: No Target entity creation on submission
**File:** `api/requests/route.ts`
**Problem:** When a blitz is submitted, no Target record is created. This means there's no way to group multiple blitzes for the same company/contact, track round progression, or accumulate intelligence. Every submission is isolated.
**Fix:** Phase 2 addresses this. Upsert Target on submission (userId + companyName + contactName).

### P2: Case studies only for prospect tools
**File:** `request/page.tsx` lines 609-632
**Problem:** Case studies section only shows for `isProspect`. But interview prep also benefits from case studies (to weave into talk tracks, demonstrate customer success). And deal audit needs them to benchmark the deal.
**Fix:** Show case studies for all tool types except maybe interview_outreach.

### P2: Meeting type options don't include interview sub-types
**File:** `request/page.tsx` lines 290-394
**Problem:** Interview tools only get "Mock Pitch" and "Hiring Manager" as meeting types. Missing: phone screen, panel interview, final round, executive interview. These produce fundamentally different prep materials (phone screen = 30 min, broad questions; panel = multiple interviewers, diverse angles; final = executive-level, strategic).
**Fix:** Expand interview meeting types to: phone_screen, hiring_manager, panel, final_round, executive. Match the InterviewPanel.roundType enum from the schema.

### P2: Engagement context is collapsed by default
**File:** `request/page.tsx` line 66 (`engagementExpanded: false`)
**Problem:** Meeting date, engagement type, and prior interactions are hidden behind a collapsible. These are critical context inputs. Users who don't expand this section produce lower-quality outputs. The form should guide users toward providing this context, not hide it.
**Fix:** Show meeting date and engagement type inline (not collapsed). Move "prior interactions" to the collapsible. Or: if meetingDate is within 7 days, highlight urgency.

### P3: No "run from previous" option
**File:** `request/page.tsx`
**Problem:** If I'm doing interview_outreach for Zip, then later do interview_prep for Zip, the prep form doesn't pre-fill from the outreach submission. The user re-enters company, name, role, LinkedIn, JD.
**Fix:** When tool is selected and user has prior runs for the same company, offer to pre-fill from the most recent run.

---

## 3. DASHBOARD

### P2: Recent blitzes table is minimal
**File:** `dashboard/page.tsx` lines 601-637
**Problem:** The table only shows: tool name, date, status icon. No company name, no contact name, no link to the blitz detail page, no ability to act on the blitz (practice, re-run, view deliverables).
**Fix:** Add columns: Company, Contact, and a "View" link. Make rows clickable to navigate to `/requests/[id]`.

### P2: Tool cards don't show recent activity
**File:** `dashboard/page.tsx` lines 536-597
**Problem:** Each tool card shows name, description, and a "New Blitz" button. But no indication of how many blitzes the user has run with this tool, when the last one was, or whether a blitz is in progress.
**Fix:** Add subtle badge or text: "3 blitzes" or "Last: CBRE (2d ago)" per card.

### P2: No "Practice Now" CTA connected to completed blitzes
**File:** `dashboard/page.tsx`
**Problem:** Dashboard shows tools and recent blitzes separately. There's no visual connection between a completed blitz and the ability to practice it. Users have to navigate to /practice, find their blitz, then launch.
**Fix:** Add a "Practice" button on recent blitz rows (for completed blitzes). Or add a "Practice Your Latest Blitz" banner.

### P3: Mobile nav is basic
**File:** `dashboard/page.tsx` lines 325-379
**Problem:** Mobile menu is a simple dropdown with text links. No visual hierarchy, no icons, no grouping. Functional but not polished.
**Fix:** Add icons to mobile nav items. Group by section (Tools, Account, Support).

---

## 4. PROFILE & ONBOARDING

### P1: Profile API whitelist missing critical fields
**File:** `api/profile/route.ts` lines 64-80
**Problem:** The PUT whitelist has 14 fields but is missing several UserProfile schema fields that exist in the database: `icpDefinitions`, `careerSummary`, `quotaDetails`, `toolPreferences`, `customPromptRules`, `writingStyle`, `bannedPhrases`, `onboardingDepth`. If a user fills these in via onboarding chat, the manual profile editor can't update them.
**Fix:** Add all UserProfile fields to the whitelist. Or dynamically allow any field that exists on the model.

### P1: Profile page missing ICP definitions and case studies
**File:** `profile/page.tsx` (1079 lines)
**Problem:** The manual profile editor has 5 sections but doesn't expose: ICP definitions (exists in schema), case studies (referenced in request form but not storable on profile), custom prompt rules, tool preferences.
**Fix:** Add ICP section: "Who are your ideal customers? Industries, company size, titles you sell to." Add case studies section that persists across blitz submissions.

### P2: Onboarding chat vs manual profile are disconnected
**File:** `onboarding-chat/page.tsx` + `profile/page.tsx`
**Problem:** Two paths to fill the same data. If a user does chat onboarding then visits manual profile, changes in one don't clearly reflect in the other. The depth indicator (0-4) on dashboard is based on onboarding chat progress, not actual field completeness.
**Fix:** Unify the depth calculation. Base it on actual field completeness (e.g., has company name + product = 1, has deal stories + methodology = 2, etc.), not just which onboarding phases were completed.

---

## 5. API-LEVEL GAPS

### P1: No Target entity usage anywhere
**Files:** All API routes
**Problem:** Target model exists in schema (Phase 1 complete) but zero API routes reference it. No RunRequest sets targetId. No PracticeSession sets targetId. The entity is a ghost.
**Fix:** Phase 2-5 addresses this progressively.

### P1: Practice session doesn't link to RunRequest
**File:** `api/practice/start/route.ts`
**Problem:** Even when `runRequestId` is passed and research is loaded from it, the resulting PracticeSession doesn't store `runRequestId`. The connection between "this practice session was powered by this blitz" is lost in the DB.
**Fix:** Add `runRequestId` to the PracticeSession create call.

### P2: No stale session cleanup
**Files:** `api/practice/start/route.ts`, `lib/practice.ts`
**Problem:** If a user starts a session but never ends it (closes browser, network drop), the session stays in "active" or "created" status forever. These count against the monthly cap.
**Fix:** Add a cleanup job or check on session start: if any session is >1 hour old and still "active", mark it "abandoned".

### P2: Scoring uses same model as conversation
**Files:** `api/practice/end/route.ts`, `api/practice/message/route.ts`
**Problem:** Both conversation (persona responses) and scoring use `claude-sonnet-4-20250514`. Scoring is a one-shot evaluation with no latency constraint, so it could use a more capable model (Opus) for better coaching quality. Or use Haiku for the persona (faster response time, better conversational feel) and Sonnet for scoring.
**Fix:** Use Haiku for persona responses (latency matters), Sonnet or Opus for scoring (quality matters).

---

## 6. COPY & MESSAGING

### P2: Practice lobby copy says "video avatar" — misleading if avatar fails
**File:** `practice/page.tsx` line 224
**Problem:** "you'll practice a live conversation against a video avatar" sets an expectation. If the avatar doesn't load (API error, quota exceeded), there's no fallback messaging.
**Fix:** Add graceful degradation copy: "Avatar unavailable. Continue with text-only practice?" Or pre-check avatar availability.

### P2: "Submit your request details below" — generic
**File:** `request/page.tsx` line 209
**Problem:** Every tool gets the same subtitle. Interview Outreach should say something like "Tell us about the role and who you're targeting." Interview Prep should say "Give us everything you've got so we can build your playbook."
**Fix:** Dynamic subtitle per tool category.

### P3: Consulting CTA email subject is generic
**File:** `dashboard/page.tsx` line 654
**Problem:** `mailto:evan@salesblitz.ai?subject=Sales%20Blitz%20Consulting`. The CTA copy says "Custom outbound engine" but the email subject is generic. Pre-fill with something specific.
**Fix:** Subject: "Custom Outbound Engine — Let's Talk"

---

## Summary Stats

| Severity | Count |
|----------|-------|
| P0       | 2     |
| P1       | 12    |
| P2       | 13    |
| P3       | 4     |
| **Total** | **31** |

The two P0s (blitz card not launching directly, review page fetching from list endpoint) and the P1s around context depth (only 4 profile fields used, research truncated to 8K, no panel fields, no Target usage) are the core quality gaps. The architecture is sound but the context pipeline has holes at every stage: onboarding doesn't collect enough, submission doesn't collect enough, practice start doesn't use enough of what was collected, and practice end doesn't feed learnings back.

The Phase 2-6 plan directly addresses most P0 and P1 issues. The P2s should be fixed as we touch each file.

---

## Fixes Applied (Mar 8, 2026 evening session)

### P0 Fixes
- **P0: Blitz card click doesn't launch session directly** — FIXED in prior commit. Practice lobby redesigned with one-click launch from blitz cards. Confirmed working: Radiant Logic card -> session starts immediately with HeyGen avatar.

### P1 Fixes
1. **Dashboard missing prospect context (#1)** — Added targetName/targetCompany columns to Recent Blitzes table, click-to-navigate rows, fixed "delivered" status recognition. `dashboard/page.tsx`
2. **practice_mode display name (#2)** — Added "AI Practice Mode" label to requests/page.tsx and analytics/page.tsx TOOL_LABELS maps
3. **Champion Builder step 6 stuck spinner (#4)** — Fixed via DB UPDATE (step status "in_progress" -> "completed") + defensive rendering: if overall run is delivered, all steps show complete. `requests/[id]/page.tsx`
4. **Retry button for stalled requests (#5)** — Expanded retryable statuses to include "submitted" and stalled "researching" (no startedAt). `api/requests/[id]/retry/route.ts`
5. **Practice Mode routes through worker pipeline (#6)** — Three-layer fix: (a) removed practice_mode from request form TOOL_INFO, (b) added redirect to /practice if URL param present, (c) added API guard rejecting practice_mode RunRequest submissions. `request/page.tsx`, `api/requests/route.ts`. Cleaned up stuck DB record.

### P2 Fixes
6. **Asset label normalization (#8)** — Added worker key mappings (povDeckPptx, callSheet1Img, callSheet2ImgA, callSheet2ImgB, landscape, outreachSequenceJson) and EXTRA_ASSET_LABELS for human-readable names. `lib/normalize-assets.ts`
7. **Nav inconsistency (#10)** — Created shared AppNav component with consistent nav items. Integrated into analytics + playbooks pages. `components/AppNav.tsx`, `analytics/page.tsx`, `playbooks/page.tsx`

### Knowledge Base Population
8. **KB nearly empty** — Inserted 8 documents: CotM Framework, MEDDPICC, Discovery Philosophy, 4 deal stories (Vuori, Spectrum, Red Bull, CBRE), ICP Definitions. KB went from 2 docs (~2K chars) to 10 docs (~14.5K chars).

### E2E Verification (Mar 8, 2026)
- Full pipeline confirmed: profile fill -> blitz submit (Radiant Logic / Tre Menzel Prospect Prep) -> 11/11 steps completed -> 8 assets delivered (131K research data) -> competitive playbook shows proper CotM structure, persona-specific discovery questions, MEDDPICC-aligned stakeholder map -> practice lobby shows new card -> one-click launch -> HeyGen avatar loads & speaks in character -> review page with scoring

### Polish Issue Noted
- Practice persona name ("Marcus Chen") doesn't match actual target ("Tre Menzel"). Persona should use the target contact name from the blitz.

### Updated Summary Stats

| Severity | Original | Remaining |
|----------|----------|-----------|
| P0       | 2        | 1 (review page endpoint) |
| P1       | 12       | 7         |
| P2       | 13       | 11        |
| P3       | 4        | 4         |
| **Total** | **31**  | **23**    |

### Files Changed (ready for commit via GitHub Desktop)

**Modified (9):**
- `src/app/analytics/page.tsx` — AppNav integration, practice_mode label
- `src/app/api/requests/[id]/retry/route.ts` — Accept stalled requests for retry
- `src/app/api/requests/route.ts` — Block practice_mode submissions via API
- `src/app/dashboard/page.tsx` — Prospect columns, click-to-navigate, delivered status
- `src/app/playbooks/page.tsx` — AppNav integration
- `src/app/request/page.tsx` — Remove practice_mode from form, add redirect
- `src/app/requests/[id]/page.tsx` — Defensive step rendering for delivered runs
- `src/app/requests/page.tsx` — practice_mode & competitor_research labels
- `src/lib/normalize-assets.ts` — Asset key mappings & labels

**New (1):**
- `src/components/AppNav.tsx` — Shared navigation component
