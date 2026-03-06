# AltVest Asset QA Report - March 6, 2026

## Runs Reviewed

| Run | ID | Tool | Status | Assets |
|-----|-----|------|--------|--------|
| Radiant Logic / Tre Menzel | 6ff42b84 | prospect_prep | delivered | 8 (briefPdf, povDeck, povDeckPptx, gammaDeck, notebookCard, callPrepSheet, stakeholderMap, competitivePlaybook) |
| Cognisen / Phil Lan | 69fff79d | deal_audit | delivered | 4 (briefPdf, notebookCard, callPrepSheet, stakeholderMap) |

---

## CRITICAL FINDINGS (Must Fix in Code)

### F1: Stakeholder Map Only Shows Primary Contact
**Severity:** High
**Affects:** Both runs
**Issue:** Stakeholder maps only populate the single primary contact (Tre for Radiant Logic, Phil for Cognisen). Known stakeholders from research data are not included. MEDDPICC roles all show "Unknown" despite being identifiable from input data.
**Evidence:**
- Radiant Logic: Only Tre shown. Missing John Pritchard (CEO since Jan 2025), Michel Prompt (Chairman/Founder). Tre's MEDDPICC role shows "Unknown" but should be Champion + Economic Buyer per Knowledge_Base.md.
- Cognisen: Only Phil shown. Missing Tom Westfall (CEO, Economic Buyer), Ben Miller (COO), Eddie Rau (CTO). Phil's role shows "Unknown" but clarification answers explicitly state he's an Influencer.
**Root Cause:** The stakeholder map generator likely only uses the `targetName`/`targetRole` input fields and doesn't extract additional stakeholders from `researchData.company` or `clarificationAnswers`.
**Fix:** Worker's stakeholder map builder should parse `researchData.company` for leadership/stakeholder mentions and populate the map. Clarification answers should also be mined for stakeholder intel.

### F2: engagementType Defaults to "cold_outreach"
**Severity:** Medium
**Affects:** Both runs
**Issue:** Both runs submitted with `engagementType: "cold_outreach"` despite:
- Radiant Logic: Tre is friend/mentor, $10K pre-approved, warm relationship
- Cognisen: Active deal, agreed terms ($1K/meeting, 90 days), multiple calls completed
**Root Cause:** Likely the submission form defaults to `cold_outreach` and users don't change it, OR the field isn't prominently surfaced.
**Impact:** Research prompts may be miscalibrated (cold outreach framing vs. warm/active deal framing), affecting tone and recommendations.
**Fix:** Either auto-detect from `priorInteractions`/`additionalNotes` content, or make the field more prominent with better defaults.

### F3: PDF Title Has Underscore Bug
**Severity:** Low
**Affects:** Both runs (confirmed on Radiant Logic)
**Issue:** Research brief PDF header shows "Prospect_prep Brief" with an underscore between "Prospect" and "prep" instead of a space.
**Root Cause:** The `toolName` value (`prospect_prep` / `deal_audit`) is being used directly in the PDF title without converting underscores to spaces and title-casing.
**Fix:** In `pdf-generator.js`, transform `toolName` before inserting into PDF header: `toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())`.

### F4: Step 9 (generating_call_docs) Shows Pending Despite Asset Existing
**Severity:** Low
**Affects:** Radiant Logic run
**Issue:** Call Prep Sheet PDF exists and is accessible, but step 9 "Generating Call Prep Docs" shows as pending (empty circle). Run shows 91% / 10 of 11 steps.
**Root Cause:** Known step tracking bug. The CallDocGenerator completes and uploads the asset, but the PATCH to update step status either fails silently or the step ID doesn't match.
**Fix:** Verify step ID consistency between worker's `stepGenerateCallDocs` and the step array initialized on submission.

---

## QUALITY FINDINGS (Content/Voice Issues)

### Q1: Em Dashes Throughout All Assets
**Severity:** High (brand voice)
**Affects:** Both runs, all text-based assets
**Issue:** Em dashes ("--") appear extensively in competitive playbook HTML, Gamma deck slides, call prep sheet PDF, and notebook cards. This directly violates CLAUDE.md Rule 3B and brand-voice.md "AI Writing Tells" section.
**Examples:**
- Competitive playbook: "pre-call vs post-call" should use commas or semicolons
- Gamma deck: "mandatory capabilities -- raising the bar"
- Call prep sheet: "competes vs Okta/Microsoft Entra/SailPoint" uses em dashes for breaks
**Root Cause:** Worker prompts to Claude don't include the anti-AI-writing instructions from brand-voice.md. The worker's system prompts need the em dash prohibition added.
**Fix:** Add to worker prompt templates: "CRITICAL: Never use em dashes (--) in any output. Use commas, periods, or semicolons instead. Use '&' instead of 'and' where natural."

### Q2: Sparse Input Data Limits Output Quality
**Severity:** Medium
**Affects:** Both runs
**Issue:** Both runs were submitted with minimal inputs:
- No `linkedinText` (LinkedIn profile data for prospect)
- No `priorInteractions` (history context)
- No `additionalNotes` (deal context)
- Wrong `engagementType`
**Impact:** Stakeholder maps are thin, competitive positioning is generic rather than tailored to known deal dynamics, and engagement framing assumes cold outreach.
**Recommendation:** This is partially a UX issue. The submission form should either require more fields for higher-quality output, or the clarification engine should ask for this context if missing.

### Q3: Call Prep Sheet Date Shows Mar 8 (Future Date)
**Severity:** Low
**Affects:** Radiant Logic run
**Issue:** Call prep sheet header shows "Mar 8, 2026" which is 2 days ahead of generation date (Mar 6).
**Root Cause:** Unclear. Possibly the PDF generator uses a future date for "delivery" or there's a timezone issue.

---

## POSITIVE FINDINGS (What Worked Well)

### P1: CotM Structure Consistent Across All Assets
The Gamma deck follows Before State, Cost of Inaction, Required Capabilities, How We Deliver, Social Proof, Next Step. The competitive playbook uses CotM deconstruction per competitor. The notebook card uses CotM framing for cost-of-inaction math. This is the core methodology working as designed.

### P2: Research Data Quality is Strong
- Radiant Logic synthesis includes SWOT with CotM mapping, specific counter-narratives, and accurate competitive positioning (Gong, Clari, Clay, Regie, Status Quo)
- Cognisen synthesis includes CJIS compliance differentiation, Tyler Technologies threat analysis, and accurate market sizing ($590M TAM, 2,000 counties, 0.45% penetration)
- Numbers cross-reference correctly against source Knowledge Base files

### P3: Competitive Playbook (Radiant Logic) is High Quality
5 competitors mapped with threat levels, landscape chart positioning, CotM deconstruction, land mine handlers, and multi-threading angles. Status Quo correctly identified as primary threat. Gong correctly positioned as complementary (post-call) vs. AltVest (pre-call).

### P4: Cognisen Deal Audit Notebook Card is Excellent
Deal health status (YELLOW) is accurate. MEDDPICC qualification gaps correctly identified. Biggest risk (Tom's skepticism) properly flagged. Next actions are specific and actionable. Win condition is well-framed.

### P5: Clarification Engine Added Real Value for Cognisen
The 3 questions asked (Tom's re-engagement, title targeting rationale, target list status) were precisely the right gaps to fill. Evan's detailed answers significantly improved the deal audit quality. Confidence went from 0.62 to much higher with the answers.

### P6: Gamma Deck is Presentation-Ready
8 slides, professional layout, specific data points ($11M to $248M Tre reference, Cognisen social proof, $468K-$702K prep cost math). CotM structure clear. Vuori case study accurately sourced from deal-stories.md.

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

All factual claims verified. No hallucinations detected in the deliverable content.

---

## PRIORITY FIX LIST

| Priority | Finding | Fix Location | Effort |
|----------|---------|-------------|--------|
| 1 | Q1: Em dashes in all outputs | Worker prompt templates | Low (add instruction) |
| 2 | F1: Stakeholder map only shows primary | Worker stakeholder-map builder | Medium (parse research data) |
| 3 | F2: engagementType defaults wrong | Frontend submission form | Low (UX change) |
| 4 | F3: PDF title underscore | pdf-generator.js | Low (string transform) |
| 5 | F4: Step 9 tracking bug | Worker step PATCH logic | Low (verify step ID) |
| 6 | Q3: Future date on call prep | CallDocGenerator | Low (date logic) |

---

*QA performed by Claude, March 6, 2026. Both runs reviewed against source Knowledge Base files, clarification answers, and brand voice requirements.*
