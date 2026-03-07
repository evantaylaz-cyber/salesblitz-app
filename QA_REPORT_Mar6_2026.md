# Sales Blitz Asset QA Report - March 6, 2026

## Runs Reviewed

| Run | ID | Tool | Status | Assets |
|-----|-----|------|--------|--------|
| Radiant Logic / Tre Menzel | 6ff42b84 | prospect_prep | delivered | 8 (briefPdf, povDeck, povDeckPptx, gammaDeck, notebookCard, callPrepSheet, stakeholderMap, competitivePlaybook) |
| Cognisen / Phil Lan | 69fff79d | deal_audit | delivered | 4 (briefPdf, notebookCard, callPrepSheet, stakeholderMap) |
| Zip / Cody Barnes | d3e67e81 | interview_outreach | delivered | 13 (briefPdf, povDeck, povDeckPptx, gammaDeck, landscape, notebookCard, callPrepSheet, callSheet1Img, clientPovCard, callSheet2ImgA, callSheet2ImgB, outreachSequence, competitivePlaybook) |

---

## CRITICAL FINDINGS & FIX STATUS

### F1: Stakeholder Map Only Shows Primary Contact — FIXED
**Severity:** High | **Status:** Code fix applied, pending deployment
**Issue:** Stakeholder maps only populate the single primary contact. Known stakeholders from research data not included. MEDDPICC roles show "Unknown."
**Fix Applied:** Refactored `stakeholder-map-generator.js`:
- Added `_extractPeopleFromResearch()` method that parses `company.stakeholder_map` MEDDPICC role keys
- Extracts named people via regex from role descriptions
- Maps extracted names to MEDDPICC roles (champion, economic_buyer, blocker, user)
- Template updated with two new data source blocks (Research badge + Role badge)
- Primary contact now gets correct MEDDPICC role from research data

### F2: engagementType Defaults to "cold_outreach" — FIXED
**Severity:** Medium | **Status:** Code fix applied, pending deployment
**Issue:** Both runs submitted with `engagementType: "cold_outreach"` regardless of context.
**Fix Applied (3 files):**
- `request/page.tsx`: Form option values normalized to snake_case (`cold_outreach`, `warm_intro`, `discovery_call`, etc.) to match worker expectations
- `api/requests/route.ts`: Added `inferEngagementType()` function that auto-detects from toolName + meetingType (interview tools default to "interview", discovery to "cold_outreach", follow_up to "follow_up", etc.)
- `api/batch-requests/route.ts`: Same inference logic for batch submissions

### F3: PDF Title Has Underscore Bug — FIXED
**Severity:** Low | **Status:** Code fix applied, pending deployment
**Issue:** Research brief PDF shows "Prospect_prep Brief" with underscore.
**Fix Applied:** `pdf-generator.js` `_formatToolName()` now normalizes underscores to hyphens before lookup. Also fixed 5 additional tool name comparison points throughout the file that had the same underscore/hyphen mismatch.

### F4: Step 9 (generating_call_docs) Never Dispatched — FIXED
**Severity:** Medium | **Status:** Code fix applied, pending deployment
**Issue:** `generating_call_docs` step defined in `executeStep` switch case but never dispatched by any execution phase. Step shows "pending" forever. Call prep PDFs (playbook, arsenal, live scenario, Q&A) were never generated.
**Root Cause:** The execution phases (A through E) didn't include `generating_call_docs`. Only the call prep *sheet* was generated (inside `stepGenerateAssets`), not the full call doc suite.
**Fix Applied:** Added Phase C2 between asset generation and outreach:
```javascript
// --- Phase C2: Call docs (depends on research + brief content from Phase C) ---
if (stepIds.includes("generating_call_docs")) {
  await this.executeStep("generating_call_docs", context);
}
```
**Impact:** `prospect_prep` with discovery/follow_up/pitch/closing meeting types + `interview_prep` with mock_pitch will now generate call playbook, arsenal, and (for mock_pitch) live scenario + Q&A docs.

### F5: Synthesis Truncation (NEW) — FIXED
**Severity:** Medium | **Status:** Code fix applied, pending deployment
**Issue:** Radiant Logic synthesis (63KB raw) was truncated mid-JSON due to 8000 max_tokens limit. Response cut off without closing braces. Stored as `{ raw: "..." }` fallback, making `synthesis.signals`, `synthesis.call_strategy`, etc. unavailable to downstream consumers (Gamma deck data, brief generation).
**Fix Applied:**
- Increased synthesis max_tokens from 8000 to 16000
- Added truncation-aware JSON repair to `salvageRawResponse()`: counts unclosed braces/brackets, trims trailing partial values, closes structures
- Also bumped outreach_sequence max_tokens from 8000 to 12000 as preventive measure

---

## INFRASTRUCTURE FIXES

### I1: Stale Run Recovery — NEW
**Status:** Code fix applied, pending deployment
**Issue:** Worker uses in-memory job queue. If worker restarts between webhook receipt and job processing, jobs are permanently lost. Found 3 runs stuck at "submitted" and 1 at "researching" (Datadog prospect_outreach) with zero progress.
**Fix Applied:** `index.js`:
- Startup recovery: queries for runs stuck at "submitted" (>5 min) or "researching"/"generating" (>15 min)
- Resets stuck processing runs back to "submitted" status
- Re-enqueues recovered runs
- Periodic check every 10 minutes (not just startup)

---

## QUALITY FINDINGS (Content/Voice Issues)

### Q1: Em Dashes Throughout All Assets — FIXED
**Severity:** High (brand voice) | **Status:** Code fix applied, pending deployment
**Issue:** Em dashes appear in all text-based assets. 128 instances in Cognisen run, 148 in Radiant Logic.
**Fix Applied (4 files):**
- `executor.js` voiceBlock: Added comprehensive anti-AI writing rules block (em dashes, "&" preference, banned words, filler openers, rhythm variation). This is the central injection point used by 7+ prompt builders via `buildMethodologyContext()`.
- `executor.js` callDocPrompt: Added standalone anti-AI rule (doesn't use voiceBlock)
- `gemini-cards.js`: Added anti-AI rule to `generateCardContent` prompt
- `batch-executor.js`: Added anti-AI rule to `buildComparativeSynthesisPrompt`
- Also fixed a literal em dash in executor.js interviewInstructions template

### Q2: Sparse Input Data Limits Output Quality
**Severity:** Medium | **Status:** UX improvement needed (no code fix yet)
**Issue:** Runs submitted with minimal inputs (no linkedinText, priorInteractions, additionalNotes). Partially addressed by F2 fix (better engagementType inference) and F1 fix (stakeholder map parsing from research data).

### Q3: Call Prep Sheet Date Shows Mar 8 (Future Date)
**Severity:** Low | **Status:** Not yet investigated
**Issue:** Call prep sheet header shows date 2 days ahead of generation.

---

## POSITIVE FINDINGS (What Worked Well)

### P1: CotM Structure Consistent Across All Assets
Gamma deck follows Before State, Cost of Inaction, Required Capabilities, How We Deliver, Social Proof, Next Step. Competitive playbook uses CotM deconstruction per competitor. Notebook card uses CotM framing for cost-of-inaction math.

### P2: Research Data Quality is Strong
- Radiant Logic: 165KB research, structured MEDDPICC stakeholder map (Tre as champion, CRO/CEO as economic buyer, Sales Enablement as blocker, AEs as users). Detailed motivations per role.
- Cognisen: 140KB research, accurate SWOT with seller land mines, Tyler Technologies threat correctly identified.
- Cross-reference: All 13 factual claims verified against source files. Zero hallucinations.

### P3: Competitive Playbook (Radiant Logic) is High Quality
5 competitors mapped with threat levels, CotM deconstruction, land mine handlers, multi-threading angles. Status Quo correctly identified as primary threat.

### P4: Cognisen Deal Audit Notebook Card is Excellent
Deal health YELLOW. MEDDPICC gaps correctly identified. Biggest risk (Tom's skepticism) flagged. Actionable next steps.

### P5: Clarification Engine Added Real Value
Cognisen: 3 questions precisely targeted the right gaps. Confidence improved significantly with answers.

### P6: Gamma Deck Presentation-Ready
8 slides, professional layout, specific data points, CotM structure. Vuori case study accurately sourced.

### P7: Zip Interview Outreach is the Richest Run
13 assets delivered including handwritten call sheets (PNG), client POV card, outreach sequence (HTML + JSON), competitive landscape. Full 11/11 steps completed. Most comprehensive output of the 3 delivered runs.

---

## CROSS-REFERENCE VERIFICATION

| Claim in Deliverable | Source File | Verified? |
|---------------------|------------|-----------|
| Radiant Logic: ~170 employees, $26.6M revenue | Knowledge_Base.md Section 1 | YES |
| Tre joined Oct 2025, VP Sales West | Knowledge_Base.md Section 4 | YES |
| James Love (CRO) departed Jan 2026 | Knowledge_Base.md Section 4 | YES |
| John Pritchard CEO since Jan 2025 | Knowledge_Base.md Section 4 | YES |
| Ridgeview Partners investment Apr 2025 | Knowledge_Base.md Section 1 | YES |
| Google Cloud $11M to $248M (Tre) | Knowledge_Base.md Section 4 | YES |
| Cognisen: $3M ARR, 9 counties, ~$333K ACV | Knowledge_Base.md Section 1 | YES |
| Tom Westfall = sole seller, former probation chief | Knowledge_Base.md Section 7 | YES |
| Phil = no budget authority, not a DM | Knowledge_Base.md Section 4 + Kevin intel | YES |
| $590M TAM, 2,000 US counties | Knowledge_Base.md Section 2 | YES |
| Vuori: closed in 120 days at Flip CX | about-me.md, deal-stories.md | YES |
| Evan: 13 years B2B, $25M+ closed | about-me.md | YES |
| $1K/meeting, 90 days, 4 titles (Cognisen deal) | clarificationAnswers | YES |

All factual claims verified. No hallucinations detected.

---

## STALLED RUNS

| Run | ID | Tool | Status | Root Cause |
|-----|-----|------|--------|-----------|
| Cognisen / Phil Hernandez | c778ec84 | prospect_prep | submitted (stuck) | Worker restart lost in-memory job. Never processed. |
| Zip / Justin Darby | 7e6b469d | interview_prep | submitted (stuck) | Same as above |
| Affirm / Parul Patel | 21111d17 | interview_prep | submitted (stuck) | Same as above |
| Datadog / Sarah Mitchell | c69f68c5 | prospect_outreach | researching (stuck) | Worker crashed mid-research. 0/8 steps completed. |

All 4 will be auto-recovered after stale run recovery mechanism is deployed.

---

## COMPLETE FIX MANIFEST

| # | Fix | File(s) Modified | Lines Changed | Priority |
|---|-----|-----------------|---------------|----------|
| P1 | Anti-AI writing rules (em dashes, banned words) | executor.js, gemini-cards.js, batch-executor.js | ~40 | Critical |
| P2 | Stakeholder map MEDDPICC parsing | stakeholder-map-generator.js | ~120 | Critical |
| P3 | engagementType form values + API inference | request/page.tsx, api/requests/route.ts, api/batch-requests/route.ts | ~20 | Medium |
| P4 | PDF title underscore normalization | pdf-generator.js | ~15 | Low |
| P5 | generating_call_docs phase dispatch | executor.js | ~8 | Medium |
| P6 | Synthesis max_tokens 8K->16K + truncation repair | executor.js | ~35 | Medium |
| P7 | Outreach sequence max_tokens 8K->12K | executor.js | 1 | Low |
| I1 | Stale run recovery (startup + periodic) | index.js | ~50 | Critical |

**Total: 8 fixes across 8 files, ~290 lines changed. All syntax-checked. Pending deployment.**

---

*QA performed by Claude, March 6, 2026. Three delivered runs + four stalled runs reviewed. All fixes applied locally, awaiting deployment to Railway (worker) and Vercel (app).*
