# Sales Blitz E2E Test Rubric

**Created:** 2026-03-11
**Purpose:** Grade every dimension of a blitz run against Sales Blitz north stars. Not just "did it run" but "is this Gong-level PMF, Apple-level design?"
**North Stars:** Context is the product. Gong-level PMF. Apple-level design. Zero-homework onboarding.

---

## Test Configuration

**Account:** evan@salesblitz.ai (freshly wiped)
**Tool:** prospect_prep (tests the deepest asset pipeline)
**Target:** Real company, real contact, real meeting scenario
**Profile:** Evan selling Sales Blitz to enterprise sales leaders

---

## 1. ONBOARDING QUALITY (Zero-Homework Standard)

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 1.1 | First-load experience | Clean welcome CTA, clear next step, no confusion about what to do | |
| 1.2 | Profile setup friction | Can complete core fields in <10 min of actual typing | |
| 1.3 | Smart defaults | Fields have sample text or guidance, not blank boxes | |
| 1.4 | Progressive disclosure | Advanced fields don't overwhelm; core fields prominent | |
| 1.5 | Resume upload → auto-fill | Upload resume, verify it extracts & populates relevant fields | |
| 1.6 | Onboarding depth tracking | Progress indicator updates as fields are completed | |
| 1.7 | Copy quality | Instructions are clear, conversational, Evan-voice. No jargon. | |
| 1.8 | Mobile responsiveness | Core onboarding works on mobile viewport | |

---

## 2. BLITZ SUBMISSION UX

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 2.1 | Tool selection clarity | Each tool card explains WHO it's for and WHAT it produces | |
| 2.2 | Form field guidance | Every field has helper text explaining what good input looks like | |
| 2.3 | Context collection depth | Form collects: company, contact, title, LinkedIn, meeting type, date, engagement context, JD/instructions, case studies, documents | |
| 2.4 | Zero-homework inputs | Company name + LinkedIn URL should be enough to start. We research, they verify. | |
| 2.5 | Document upload | Can upload PDF/DOCX. File size validated. Extraction works. | |
| 2.6 | Submission feedback | Clear confirmation, estimated time, what to expect next | |
| 2.7 | Error handling | Missing required fields show clear, specific messages | |

---

## 3. RESEARCH QUALITY (Deep Research Agent)

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 3.1 | Research breadth | Covers: company overview, financials, competitors, recent news, leadership, strategy, product, market position | |
| 3.2 | Research specificity | Named people, dollar amounts, dates, percentages. Not "the company is growing." | |
| 3.3 | Source diversity | Multiple web sources used (not just company website). Verify via Langfuse or live insights. | |
| 3.4 | Brave Search firing | Confirm web_search tool is invoked (check worker logs or Langfuse traces) | |
| 3.5 | Live insights quality | Research findings card shows real intel as it arrives, not generic placeholders | |
| 3.6 | Research saves to KB | Verify KnowledgeDocument rows created with embedded vectors | |
| 3.7 | Gap fill effectiveness | After initial research, gap fill step finds what's missing and fills it | |

---

## 4. ASSET QUALITY — Research Brief (PDF)

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 4.1 | CotM structure | Before State → Negative Consequences → Required Capabilities → PBOs → Proof arc is traceable | |
| 4.2 | Specificity test | Replace company name with [COMPANY]. Does content still make sense? If yes, FAIL. | |
| 4.3 | Quantified insights | Dollar amounts, percentages, headcounts, timeframes. Not adjectives. | |
| 4.4 | Discovery questions | At least 5 tagged with pattern type (Derailment Filter, Priority Probe, Metric Anchor) and purpose | |
| 4.5 | Cost-of-Inaction math | Current state metric, compounding cost, live discovery blanks for the call | |
| 4.6 | 6 Non-Negotiables pre-fill | Company objective, area of opportunity, current state metric, ideal state, ROI quantification, what they've tried | |
| 4.7 | NSTW | Primary outcome + 2 backups + seed phrase | |
| 4.8 | Length compliance | 2,500-3,500 words, 6-8 pages. Not bloated, not thin. | |
| 4.9 | Voice test | Read aloud. Sounds like Evan at a whiteboard, not a consultant writing a deliverable. | |
| 4.10 | Anti-AI writing | No em dashes, no banned words (delve, robust, streamline, comprehensive, etc.), no triple-structure default | |
| 4.11 | PDF rendering | Clean formatting, readable fonts, proper section breaks, no broken layouts | |

---

## 5. ASSET QUALITY — POV Deck (PPTX + PDF)

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 5.1 | Slide structure | 6 slides: Three Signals / Cost of Inaction / Required Capabilities / Why Us vs. Alternatives / Year 1 Business Case / Recommended Next Step | |
| 5.2 | Before State with metric | Slide 1 opens with a quantified observation about THEIR business | |
| 5.3 | Cost-of-doing-nothing | Slide 2 has compound cost projection, not just "things could be bad" | |
| 5.4 | Customer-as-hero framing | Deck positions THEM as the protagonist making a strategic decision, not us pitching | |
| 5.5 | Content density | 800-1200 total words across 6 slides. Each field 2-4 sentences. | |
| 5.6 | Google Slides ready | PPTX opens cleanly in Google Slides. 2-step polish works: (1) "Enhance this slide" with Gemini prompt restructures layout, (2) banana button + "beautify this slide." adds visuals. | |
| 5.7 | Design quality | Clean layout, readable, professional. Would you present this to a VP? | |
| 5.8 | Anti-AI writing | Same rules as 4.10 | |

---

## 6. ASSET QUALITY — Call Prep Sheet (PDF)

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 6.1 | NSTW front-and-center | First section: ideal outcome, 2 backups, seed phrase | |
| 6.2 | Structured opener | Align objective, set agenda, agree on decision framework | |
| 6.3 | Discovery questions | Amber-highlighted, with listen-for signals in green | |
| 6.4 | Scannable density | Max 15 words per bullet. 1-2 pages total. Glanceable in a live call. | |
| 6.5 | Objection handling | Pre-loaded with likely objections + reframes (not rebuttals) | |
| 6.6 | Competitive positioning | Won't-say / will-say-instead framing | |

---

## 7. ASSET QUALITY — Call Playbook & Arsenal

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 7.1 | Opening script | Word-for-word opener, specific to this meeting | |
| 7.2 | Phased sections | Each phase has: talking points + discovery questions + listen-for signals | |
| 7.3 | Arsenal recovery lines | Word-for-word lines for when you get stuck. Specific, not generic. | |
| 7.4 | ROI math section | Pre-built ROI calculation the seller can walk through live | |
| 7.5 | Multi-thread prompts | Specific stakeholders to reach + suggested approach per person | |
| 7.6 | Close sequence | Ask, handle, confirm next steps | |

---

## 8. ASSET QUALITY — Competitive Playbook

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 8.1 | Named competitors | Real competitors identified from research, not generic | |
| 8.2 | Value arc framing | Counter-arguments use Cost-of-Inaction logic, not feature comparison | |
| 8.3 | Won't-say / will-say | Specific competitive positioning language | |
| 8.4 | Trap questions | Questions that expose competitor weaknesses without attacking | |

---

## 9. ASSET QUALITY — Outreach Sequence

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 9.1 | 7 touches, 14-21 days | Correct cadence architecture | |
| 9.2 | Touch 1: zero product talk | First email about THEM, not us. Under 90 words. | |
| 9.3 | Subject lines | 4-7 words, lowercase, curiosity-driven. Never "Introduction." | |
| 9.4 | Each touch adds NEW angle | No "just checking in." Each follow-up brings new value. | |
| 9.5 | Research-specific content | Every touch references specific data from research, not generic | |
| 9.6 | Multi-threading touch (#7) | Different stakeholder with different angle | |
| 9.7 | VP-length compliance | Emails <90 words, LinkedIn <40, connection requests <25 | |

---

## 10. ASSET QUALITY — Handwritten Notebook Cards

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 10.1 | Visual quality | Looks like actual handwritten notes. Readable. Professional. | |
| 10.2 | Content relevance | Side A: POV on their business. Side B: action plan or discovery roadmap. | |
| 10.3 | Designed to send | Instructions make clear these are for mailing, not reading during calls | |

---

## 11. ASSET QUALITY — Gamma Deck

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 11.1 | Generated successfully | Gamma API produced a viewable presentation | |
| 11.2 | Content alignment | Matches POV deck narrative (same value arc, not contradictory) | |
| 11.3 | Visual polish | Gamma's design system applied, looks professional | |

---

## 12. CUSTOMER INSTRUCTIONS & TOOL LEVERAGE

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 12.1 | NotebookLM instructions | Step-by-step: which PDFs to upload, which Studio features to use, copy-paste prompts for each | |
| 12.2 | NotebookLM prompt quality | Audio/video/flashcard/quiz prompts are SPECIFIC to this blitz (company name, role, key themes) | |
| 12.3 | Google Slides instructions | Clear 2-step guidance: (1) Enhance this slide + Gemini prompt, (2) banana button + "beautify this slide." Requirement note (Google One AI Premium $20/mo). | |
| 12.4 | Handwritten card instructions | Mail guidance, print recommendations, regeneration prompt for Google AI Studio | |
| 12.5 | Recording/note-taking etiquette | Disclosure script, compliance note (11 all-party consent states), graceful "turn it off" guidance | |
| 12.6 | Screen setup recommendations | Monitor count selector, call-type-aware layout guidance (video/audio/presenting) | |
| 12.7 | WorkflowGuide sequence | Step-by-step checklist with time estimates. Logical order. Nothing missing. | |
| 12.8 | AssetGuide by tool type | Instructions adapt to tool (interview prep vs. prospect prep vs. outreach). Not generic. | |
| 12.9 | Instructions actionable | User knows EXACTLY what to do next after reading. No ambiguity. | |
| 12.10 | External tool links | NotebookLM link works (https://notebooklm.google.com/). Any other links verified. | |

---

## 13. DELIVERY & PRESENTATION

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 13.1 | Email delivery | Blitz completion email arrives with correct subject, assets listed, CTA to view in app | |
| 13.2 | Email copy quality | Professional, concise, Evan-voice. Not robotic or over-formatted. | |
| 13.3 | App results page | All assets displayed with download links. Clean layout. Nothing broken. | |
| 13.4 | Asset download | Every asset downloads correctly (PDF, PPTX, images) | |
| 13.5 | Progress tracking | During blitz: step progress updates in real-time, live insights appear | |
| 13.6 | Error recovery | If one asset fails, others still generate (Promise.allSettled pattern) | |

---

## 14. METHODOLOGY ALIGNMENT

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 14.1 | Value arc present | Every major asset follows: Before State → Negative Consequences → Required Capabilities → PBOs → Proof | |
| 14.2 | Discovery over pitching | Assets prompt conversation, not close it. Hooks invite buyer to share their version. | |
| 14.3 | Qualification elements | Research pre-fills qualification elements: metrics, economic buyer, decision criteria, identified pain, champion candidate, competition | |
| 14.4 | Multi-threading | Stakeholder map identifies 3+ people to engage, with role-specific approach per person | |
| 14.5 | Storytelling over data dumps | Proof points live inside stories (CBRE example format), not isolated statistics | |
| 14.6 | Objection reframes | Not "here's why you're wrong" but "here's a different way to think about it" | |
| 14.7 | No trademarked terms | Zero mentions of MEDDPICC, CotM, Command of the Message in any customer-facing output | |

---

## 15. PRACTICE MODE (HeyGen Integration)

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 15.1 | Session launches from blitz | "Practice Now" on completed blitz card → session starts without intermediate form | |
| 15.2 | Avatar loads & speaks | HeyGen LiveAvatar renders, lip-syncs, TTS works | |
| 15.3 | Female avatar works | If persona is female, correct avatar ID loads | |
| 15.4 | Chroma key quality | Green screen removed cleanly, no artifacts | |
| 15.5 | Persona uses blitz context | Interviewer/prospect references specific research from the blitz, not generic | |
| 15.6 | STT works | OpenAI Realtime transcription captures user speech accurately | |
| 15.7 | Scoring quality | End-of-session scores are meaningful, dimension-appropriate, actionable feedback | |
| 15.8 | Review page | Shows transcript, scores per dimension, overall score, coaching feedback | |
| 15.9 | Debrief capture | User can add notes/reflections after seeing scores | |

---

## 16. DATA INTEGRITY

| # | Check | Pass Criteria | Grade |
|---|-------|--------------|-------|
| 16.1 | RunRequest created | Row in DB with correct userId, toolName, status progression | |
| 16.2 | Target entity created | Target upserted on submission (userId + companyName + contactName) | |
| 16.3 | KB docs embedded | Research saved as KnowledgeDocument with Gemini embeddings | |
| 16.4 | Quality score stored | RunRequest.qualityScore populated after generation | |
| 16.5 | Langfuse traces | Generation traced with model, tokens, latency, cost | |
| 16.6 | Step progress | All steps recorded with timing, status, any errors | |

---

## Scoring

**Per check:** PASS / FAIL / PARTIAL / N/A
**Per section:** Count passes, calculate percentage
**Overall:** Weighted by section importance

| Section | Weight | Rationale |
|---------|--------|-----------|
| Asset Quality (sections 4-11) | 40% | This IS the product |
| Customer Instructions (section 12) | 15% | How we multiply asset value with external tools |
| Research Quality (section 3) | 15% | Context drives everything |
| Methodology Alignment (section 14) | 10% | Our differentiation |
| Onboarding (section 1) | 8% | First impression, zero-homework gate |
| Delivery (section 13) | 5% | Last mile |
| Practice Mode (section 15) | 5% | Compound value, still early |
| Data Integrity (section 16) | 2% | Infrastructure, should just work |

**Quality Bar:** 85%+ overall to ship with confidence. Any section below 70% = blocker.
