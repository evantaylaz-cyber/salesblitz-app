# Phase 2.5: Batch Mode + Tiering — Design Spec

> **Author:** Claude (scoped with Evan)
> **Date:** 2026-03-02
> **Status:** DRAFT — awaiting Evan's review
> **Depends on:** Phase 2 (single-request execution engine) — DEPLOYED

---

## The Problem

Sales Blitz currently processes one prospect at a time. A seller mapping into a new territory or prepping for a multi-threading play has to submit 5-10 individual requests, wait for each to finish, then manually cross-reference the results. That's slow, expensive (5-10 runs), and misses the comparative insight that makes batch research valuable — "which of these 8 accounts should I prioritize and why?"

## What Batch Mode Delivers

Submit N accounts (2-10) in a single request. Get everything the single-request flow produces per account, PLUS a comparative analysis layer:

1. **Per-account deliverables** (existing): Research Brief PDF, POV Deck, Handwritten Cards, Cheat Sheet, Competitive Landscape
2. **Batch-level deliverables** (NEW):
   - **Account Prioritization Scorecard** — Ranks all N accounts by deal readiness, competitive vulnerability, timing signals
   - **Comparative Landscape** — Single interactive HTML showing all N accounts on one map
   - **Territory Strategy Brief** — Narrative PDF: where to start, sequencing rationale, resource allocation

---

## Architecture Design

### Data Model

```
New model: BatchJob
├── id: UUID (primary key)
├── userId: FK → User
├── status: "submitted" | "researching" | "synthesizing" | "ready" | "delivered" | "failed"
├── batchType: "territory_mapping" | "multi_threading" | "competitive_sweep"
├── accounts: JSON[] — [{targetName, targetCompany, targetRole, linkedinUrl, ...}]
├── synthesisData: JSON? — comparative analysis output
├── batchAssets: JSON[] — [{id, label, format, url}] for batch-level deliverables
├── steps: JSON[] — batch-level orchestration steps
├── createdAt, updatedAt, completedAt, deliveredAt
└── priority: Boolean

Updated model: RunRequest
├── batchJobId: FK → BatchJob? (null for single requests)
├── batchIndex: Int? (position in batch, 0-indexed)
└── (all existing fields unchanged)
```

This is additive — zero breaking changes to single-request flow. A RunRequest with `batchJobId = null` behaves exactly as today.

### Batch Pipeline (10 steps)

```
Step 1-4: Per-account research (parallel across accounts)
  ├── For each account in batch:
  │   ├── competitive_research
  │   ├── market_intel
  │   ├── company_deep_dive
  │   └── strategic_synthesis
  │
Step 5: Comparative synthesis (NEW — runs AFTER all accounts researched)
  ├── Cross-account SWOT comparison
  ├── Deal readiness scoring (1-10 per account)
  ├── Priority ranking with rationale
  └── Territory sequencing recommendation
  │
Step 6: Per-account asset generation (parallel)
  ├── Same as today: Brief PDF, POV Deck, Cards, Cheat Sheet
  │
Step 7: Batch asset generation (NEW)
  ├── Account Prioritization Scorecard (PDF)
  ├── Comparative Landscape (HTML)
  └── Territory Strategy Brief (PDF)
  │
Step 8: Per-account landscape generation
Step 9: Formatting & QA
Step 10: Delivery (single email with all assets organized by account)
```

### Parallelism Strategy

The single-request worker processes sequentially. For batch mode, we parallelize WITHIN the batch:

```
Phase A: Research (parallel)
  Account 1: [comp_research → market_intel → deep_dive → synthesis]
  Account 2: [comp_research → market_intel → deep_dive → synthesis]
  Account 3: [comp_research → market_intel → deep_dive → synthesis]
  (run all accounts concurrently, each account's 4 steps are sequential)

Phase B: Comparative Synthesis (sequential, needs all Phase A complete)
  [cross_account_synthesis]

Phase C: Asset Generation (parallel)
  Account 1: [brief_pdf, pov_deck, cards, cheat_sheet]
  Account 2: [brief_pdf, pov_deck, cards, cheat_sheet]
  Account 3: [brief_pdf, pov_deck, cards, cheat_sheet]
  Batch:     [scorecard_pdf, comparative_landscape, territory_brief]

Phase D: Delivery (sequential)
  [formatting → delivery_email]
```

This turns a 10-account batch from ~80 minutes sequential to ~25 minutes (4 research steps × ~2 min each + synthesis + parallel asset gen).

### Worker Implementation

**Option A (recommended): Batch Executor class**

New file: `src/batch-executor.js`

```javascript
class BatchExecutor {
  async execute(batchJob) {
    const accounts = batchJob.accounts;

    // Phase A: Parallel per-account research
    const researchResults = await Promise.allSettled(
      accounts.map((account, i) =>
        this.researchAccount(account, i, batchJob)
      )
    );

    // Phase B: Cross-account synthesis
    const synthesis = await this.comparativeAnalysis(researchResults, batchJob);

    // Phase C: Parallel asset generation
    await Promise.allSettled([
      ...accounts.map((account, i) =>
        this.generateAccountAssets(account, i, researchResults[i], batchJob)
      ),
      this.generateBatchAssets(synthesis, batchJob)
    ]);

    // Phase D: Delivery
    await this.deliverBatch(batchJob);
  }
}
```

The existing `Executor` class stays untouched. BatchExecutor composes it — calls the same research prompts, same PDF generators, same landscape generator. The only new Claude calls are for comparative synthesis and batch-level assets.

**Option B: Reuse existing Executor, fan out child RunRequests**

Create N child RunRequests from the BatchJob, let the existing queue process them naturally, then run synthesis after all children complete. Simpler but slower (sequential queue) and harder to coordinate the "wait for all children" step.

**Recommendation:** Option A. The parallelism matters for user experience, and the BatchExecutor is cleanly separated from the single-request path.

### API Changes

```
POST /api/batch-requests
  Body: {
    toolName: "prospect_prep",     // same tool for all accounts in batch
    batchType: "territory_mapping",
    accounts: [
      { targetName, targetCompany, targetRole?, linkedinUrl?, ... },
      { targetName, targetCompany, targetRole?, linkedinUrl?, ... },
      ...
    ],
    sharedContext: {                // applies to all accounts
      engagementType: "cold_outreach",
      additionalNotes: "Q2 territory plan for APAC...",
    }
  }

  Returns: { batchJobId, childRequestIds: [...], runsConsumed: N }

GET /api/batch-requests/[batchId]
  Returns: BatchJob + all child RunRequests + progress

PATCH /api/batch-requests/[batchId]/steps
  Worker calls this for batch-level step updates
```

### Pricing Model

Three options (recommend starting with Option 1):

**Option 1: N runs = N accounts (simple, conservative)**
- A 5-account batch costs 5 runs
- Synthesis + batch assets are "free" (included with batch)
- User understands the pricing immediately
- Good for launch — can always discount later

**Option 2: Discounted batch rate**
- First account = 1 run, additional accounts = 0.5 runs each
- 5-account batch = 3 runs instead of 5
- Incentivizes batch usage
- Harder to implement with integer run counts (need fractional or "batch credits")

**Option 3: Batch tier add-on**
- Separate "Batch Mode" subscription add-on ($X/month)
- Includes Y batch submissions per month
- Too complex for current user base

**Recommendation:** Start with Option 1 (N runs). Once we have batch usage data, introduce Option 2 as a "batch discount" promotion.

### Frontend: Batch Submission Form

New page: `/request/batch`

```
┌─────────────────────────────────────────┐
│  Batch Prospect Prep                     │
│  Research multiple accounts at once       │
│                                          │
│  Tool: [Prospect Prep ▾]                │
│                                          │
│  ┌─ Account 1 ───────────────────────┐  │
│  │ Name: [________] Company: [______] │  │
│  │ Role: [________] Website: [______] │  │
│  │ LinkedIn: [____________________]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Account 2 ───────────────────────┐  │
│  │ Name: [________] Company: [______] │  │
│  │ Role: [________] Website: [______] │  │
│  │ LinkedIn: [____________________]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [+ Add Account]                         │
│                                          │
│  Shared Context:                         │
│  [Your territory / multi-threading notes]│
│                                          │
│  This will use 3 runs from your balance. │
│  [Submit Batch Request]                  │
└─────────────────────────────────────────┘
```

### Frontend: Batch Progress Page

```
┌─────────────────────────────────────────┐
│  Batch: APAC Territory Mapping    Ready  │
│  5 accounts · Prospect Prep · 84%       │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░                │
│                                          │
│  ┌─ Per-Account Research ────────────┐  │
│  │ ✅ Datadog        — Ready         │  │
│  │ ✅ New Relic      — Ready         │  │
│  │ ✅ Splunk         — Ready         │  │
│  │ 🔄 Dynatrace     — Generating    │  │
│  │ ⏳ Elastic        — Queued        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Comparative Analysis ────────────┐  │
│  │ ⏳ Cross-Account Synthesis        │  │
│  │ ⏳ Prioritization Scorecard       │  │
│  │ ⏳ Territory Strategy Brief       │  │
│  │ ⏳ Comparative Landscape          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Click any account to view deliverables  │
└─────────────────────────────────────────┘
```

---

## Implementation Plan (4 phases)

### Phase 2.5a: Data Model + API (2-3 days)
- [ ] Add BatchJob model to schema.prisma + migration
- [ ] Add batchJobId + batchIndex to RunRequest
- [ ] Create POST /api/batch-requests endpoint
- [ ] Create GET /api/batch-requests/[id] endpoint
- [ ] Create PATCH /api/batch-requests/[id]/steps endpoint
- [ ] Extend consumeRun() for multi-run consumption

### Phase 2.5b: Worker Batch Executor (3-4 days)
- [ ] Create batch-executor.js with parallel research pipeline
- [ ] Write comparative synthesis prompt (cross-account SWOT, priority scoring)
- [ ] Generate Account Prioritization Scorecard PDF
- [ ] Generate Comparative Landscape HTML (multi-account variant)
- [ ] Generate Territory Strategy Brief PDF
- [ ] Add batch delivery email template
- [ ] Wire into index.js with POST /execute-batch endpoint

### Phase 2.5c: Frontend Batch UX (2-3 days)
- [ ] Build /request/batch page with multi-account form
- [ ] Build batch progress page (parent + child drill-down)
- [ ] Add batch request list to /requests dashboard
- [ ] Batch delivery email with organized asset links

### Phase 2.5d: Testing + Polish (1-2 days)
- [ ] End-to-end test: 3-account batch through full pipeline
- [ ] Error handling: partial batch failure (some accounts succeed, some fail)
- [ ] Budget guardian integration for batch API usage
- [ ] Performance testing: 10-account batch completion time

**Total estimated effort: 8-12 days**

---

## Open Questions for Evan

1. **Which tools support batch mode?** Recommend starting with prospect_prep and interview_prep only (highest value for territory mapping + multi-threading).

2. **Max accounts per batch?** Recommend 10 max to keep API costs and processing time reasonable.

3. **Batch types beyond territory_mapping?** The spec includes multi_threading (same company, multiple stakeholders) and competitive_sweep (one company vs. N competitors). Worth building all three or just territory mapping first?

4. **Pricing:** Start with 1 run per account (Option 1), or want to explore batch discounts from day 1?

5. **Priority:** Should batch jobs get their own queue priority, or share the existing queue? Closer-tier users with priority_processing could get batch priority too.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| API cost explosion (10 accounts × 4 research calls × ~$0.15 each) | BudgetGuardian already exists, extend to batch-level budgets |
| Worker timeout on large batches | Railway has no timeout (unlike Vercel 60s). Promise.allSettled handles partial failures gracefully |
| Partial batch failure (3 of 5 accounts succeed) | Mark batch as "partial", deliver what we have, offer retry for failed accounts |
| Clarification loop for 10 accounts | Skip clarification for batch requests (batch users typically know their accounts well) |
| Queue starvation (big batch blocks single requests) | Separate batch queue or interleaving strategy |
