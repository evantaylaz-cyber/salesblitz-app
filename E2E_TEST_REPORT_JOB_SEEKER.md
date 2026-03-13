# E2E Test Report: Job Seeker Paths (Interview Prep)

**Date:** March 12, 2026
**Test Account:** evan.tay.laz@gmail.com (user_id: 7b922453-38a5-4c4c-b5dd-ad0962120228)
**Environment:** Production (app.salesblitz.ai + Railway worker)
**Deployed Code:** Pre-timeout-fix (STEP_TIMEOUT_MS = 11 min, competitive_research maxUses = 5)

---

## Executive Summary

All 4 job seeker E2E paths **completed successfully via retry** after hitting the 11-minute research timeout on initial submission. The retry mechanism works reliably: it preserves cached researchData, skips completed research steps, and goes straight to generation. Generation completes in 40s to 4.7 min depending on context complexity.

**Critical finding:** The 11-minute timeout is too short for all 3 research steps (competitive_research, company_deep_dive, market_intel). Every single initial run timed out. The staged fix (15 min timeout, 4 max web searches) needs to be deployed.

---

## Test Matrix

| Path | Profile Config | Target Company | Initial Result | Timeout Step | Retry Result | Retry Time | Assets Delivered |
|------|---------------|----------------|---------------|--------------|-------------|------------|-----------------|
| 1 | No resume, no case studies | (prior session) | TIMEOUT | competitive_research | DELIVERED | ~40s | 3/3 |
| 2 | Resume only | Stripe | TIMEOUT | competitive_research | DELIVERED | ~40s | 3/3 |
| 3 | Resume + case studies | Datadog | TIMEOUT | company_deep_dive | DELIVERED | ~40s | 3/3 |
| 4 | Resume + case studies + instructions | Snowflake | TIMEOUT | market_intel | DELIVERED | ~4m 8s | 3/3 |

---

## Path Details

### Path 1: Job Seeker, No Resume, No Case Studies
- **Profile:** lifecycle_stage=job_seeking, onboarding_completed=true, no resume_text, no case_studies
- **Submission:** interview_prep tool, minimal inputs
- **Initial run:** Timed out on competitive_research after 11 min
- **Retry:** Completed ~40s, all 3 assets delivered (Context File, Speaker Notes, POV Deck)
- **Notes:** Tested in prior session. Retry mechanism confirmed working.

### Path 2: Job Seeker, Resume Only (Stripe)
- **Profile:** lifecycle_stage=job_seeking, resume_text populated (Affirm/ZipRecruiter/Cognisen experience), no case_studies
- **Target:** Stripe, Senior Enterprise AE, with full JD
- **Submission:** interview_prep, meeting type = Phone Screen
- **Run ID:** ecc391f1-82f2-4328-ace5-e77caee598f2
- **Initial run:** Timed out on competitive_research after 11 min
- **Retry:** Completed ~40s, all 3 assets delivered
- **Results page:** Research findings showed Company + Market Intel + Competitive data. Full deliverable guide rendered. Practice Mode link present.

### Path 3: Job Seeker, Resume + Case Studies (Datadog)
- **Profile:** resume_text + 2 case_studies (ZipRecruiter Enterprise Deal, Cognisen Healthcare Platform Launch)
- **Target:** Datadog, Enterprise AE, with full JD
- **Submission:** interview_prep, meeting type = Hiring Manager Interview
- **Run ID:** (from prior session batch)
- **Initial run:** Timed out on company_deep_dive after 11 min (NOT competitive_research)
- **Retry:** Completed ~40s, all 3 assets delivered
- **Notes:** First evidence that company_deep_dive also times out, not just competitive_research. Phase A runs both in parallel; either can be the bottleneck.

### Path 4: Job Seeker, Resume + Case Studies + Instructions (Snowflake)
- **Profile:** resume_text + 2 case_studies
- **Target:** Snowflake, Senior Enterprise AE, $320K-$380K OTE
- **Submission:** interview_prep, meeting type = Panel Interview, detailed instructions (mock first call scenario, panel composition, Q&A topics, whiteboard territory planning)
- **Run ID:** e7e38b0e-d7fc-4492-adbe-a266dd7df5bd
- **Initial run:** Timed out on market_intel after 11 min. Note: Phase A (competitive_research + company_deep_dive) completed, but then market_intel in Phase B timed out.
- **Retry:** Completed in 4m 8s (significantly slower than Paths 1-3). Context File generation took 3m 27s due to heavy context (panel instructions + resume + case studies + research data).
- **Results page:** Research findings showed Company + Market Intel (2 of 3 categories). Full deliverable guide, Google Slides Beautify steps, NotebookLM integration, Practice Mode link all rendered correctly.

---

## Bugs Found (This Session)

### P0: All Research Steps Can Timeout (Systematic)

**Severity:** P0 — blocks every initial submission
**Impact:** 4/4 test runs timed out on initial submission
**Root cause:** STEP_TIMEOUT_MS = 11 min is insufficient for Claude + web_search tool calls
**Steps that timed out across all paths:**
- competitive_research (Paths 1, 2)
- company_deep_dive (Path 3)
- market_intel (Path 4)

**Fix staged (not deployed):**
- executor.js line ~144: STEP_TIMEOUT_MS changed from 11 min to 15 min
- executor.js line ~828: competitive_research maxUses changed from 5 to 4

**Note:** The maxUses fix only addresses competitive_research. company_deep_dive and market_intel may need similar tuning if they continue to timeout after the 15 min change.

### P2: Progress Bar Shows Wrong State After Retry

**Observed:** After clicking Retry, the results page briefly shows stale state (old error, old progress %). Page must be manually refreshed or wait for polling to catch up.
**Cause:** Retry resets the DB row, but the frontend polling may not immediately pick up the transition from failed → submitted → researching.

### P2: "Taking longer than usual" Shows Immediately After Retry

**Observed:** Known from prior session. Queue age calculation uses original createdAt timestamp, not the retry timestamp.
**Impact:** Cosmetic — user sees "taking longer than usual" immediately after retry, which is confusing.

### P3: Skipped Research Steps Show Empty Circles

**Observed:** On retry, steps that were skipped (because researchData was cached) show as empty circles without checkmarks in the step list. Steps 1 (competitive_research) and 3 (company_deep_dive) showed empty on Path 4 retry.
**Impact:** Cosmetic — user might wonder why some steps weren't completed.

### P3: Research Findings Missing Categories on Partial Research

**Observed:** When research steps timeout, the results page only shows data from steps that completed before the timeout. Path 4 showed Company + Market Intel but no Competitive data.
**Impact:** Expected behavior, but the UX doesn't communicate that some research categories are missing. User might not realize they're getting partial data.

---

## Retry Mechanism Assessment

The retry mechanism is **production-ready** and works consistently:
- Preserves researchData from initial run (no re-research)
- Skips completed research steps
- Goes directly to generation phase
- Completes in 40s for simple paths, up to 4+ min for complex paths
- All 3 assets always delivered on retry
- No data corruption or FK issues

**Recommendation:** The retry is a solid safety net, but users shouldn't need to retry 100% of the time. Deploying the timeout fix should reduce initial timeouts significantly.

---

## Deliverable Philosophy v1.0 Verification

Verified across all 4 paths that the results page renders:
- [x] Context File (.md) with NotebookLM upload guidance
- [x] Speaker Notes (.md) — correctly labeled (not "On-Screen Notes")
- [x] POV Deck (5 slides, .pptx) with Google Slides Beautify guide
- [x] "How to use your deliverables" section (Before/During/For sending)
- [x] Screen Setup widget (Laptop only / Laptop+1 / Laptop+2, Video/Audio/Presenting)
- [x] Recording & note-taking etiquette section
- [x] Google Slides Beautify 3-step guide with Google One AI Premium callout
- [x] "What to do next" checklist with time estimates
- [x] Practice Mode "Start Practice" link
- [x] NotebookLM "Study with NotebookLM" integration card
- [x] "What happened" step list (collapsed on completed runs)
- [x] Research findings summary

---

## Subscription Tracking

| Action | Runs Remaining | Runs Total |
|--------|---------------|------------|
| After wipe | 20 | 20 |
| After Path 2 submission | 19 | 20 |
| After Path 2 retry | 19 | 20 (no extra charge) |
| After Path 3 submission | 18 | 20 |
| After Path 3 retry | 18 | 20 |
| After Path 4 submission | 17 | 20 |
| After Path 4 retry | 17 | 20 |

Retries correctly do not decrement the subscription counter.

---

## Action Items

1. **DEPLOY** executor.js timeout fix (STEP_TIMEOUT_MS: 15 min, maxUses: 4) — Evan commit + push to salesblitz-worker
2. **MONITOR** post-deploy: run 2-3 blitzes to verify research steps complete within 15 min without timeout
3. **CONSIDER** adding maxUses limits to company_deep_dive and market_intel if they continue to timeout after the 15 min fix
4. **LOW PRIORITY** Fix retry UX bugs (P2: queue age calculation, P3: skipped step indicators)
