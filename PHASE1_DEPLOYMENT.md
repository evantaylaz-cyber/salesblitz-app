# Phase 1 Deployment Guide — Job Tracking & Execution Steps

## What Changed

### Schema (Prisma)
- `RunRequest` model gets 5 new fields:
  - `currentStep` (String?) — active step ID for live progress display
  - `steps` (Json, default `[]`) — array of execution steps with status tracking
  - `assets` (Json, default `[]`) — array of deliverable assets with download URLs
  - `researchData` (Json?) — cached research output between execution steps
  - `errorMessage` (String?) — error details if execution fails
- Status values updated: `submitted | researching | generating | ready | delivered | failed`

### New Files
- `src/lib/job-steps.ts` — Step templates and asset manifests per tool
- `src/app/api/requests/[id]/route.ts` — GET single request with progress data
- `src/app/api/requests/[id]/steps/route.ts` — PATCH to update step progress (used by execution engine)
- `src/app/requests/[id]/page.tsx` — Customer-facing request detail page with live progress

### Modified Files
- `prisma/schema.prisma` — RunRequest model updated
- `src/app/api/requests/route.ts` — POST now initializes steps + assets
- `src/app/requests/page.tsx` — Request list now shows step progress bars, cards are clickable

## Deployment Steps

### 1. Environment Variable (add to Vercel)
```
INTERNAL_API_KEY=<generate-a-random-uuid-here>
```
This is used by the execution engine (Phase 2) to update step progress without Clerk auth.

### 2. Run Database Migration
```bash
# Option A: Via Prisma (if you have direct DB access)
npx prisma db push

# Option B: Run raw SQL
# Execute the SQL in prisma/migrations/phase1_job_tracking/migration.sql
# against your PostgreSQL database
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Deploy to Vercel
```bash
git add .
git commit -m "Phase 1: Add execution step tracking to run requests"
git push
```

### 5. Verify
1. Go to your dashboard, submit a test run request
2. Check `/requests` — you should see the request with a progress bar (all steps "pending")
3. Click into the request — you should see the detail page with all steps listed
4. Test the step update API (simulate execution engine):
```bash
curl -X PATCH https://app.alternativeinvestments.io/api/requests/<REQUEST_ID>/steps \
  -H "Content-Type: application/json" \
  -H "x-api-key: <YOUR_INTERNAL_API_KEY>" \
  -d '{"stepId": "competitive_research", "stepStatus": "in_progress"}'
```
5. Refresh the detail page — you should see the first step spinning

## What This Enables (Phase 2)

The step update API (`PATCH /api/requests/[id]/steps`) is the interface the execution engine will use. In Phase 2, a serverless function will:

1. Pick up new RunRequests with status "submitted"
2. Walk through each step, calling the Claude API for research + generation
3. Update step progress via the API as it goes
4. Upload generated assets to storage
5. Update asset URLs in the request
6. Mark the final delivery step as complete

The customer sees all of this happening in real-time on the detail page.

## API Reference

### GET /api/requests/[id]
Returns full request detail with parsed steps, assets, and progress percentage.

### PATCH /api/requests/[id]/steps
Update step status or add assets. Auth: admin user OR `x-api-key` header.

**Update a step:**
```json
{
  "stepId": "competitive_research",
  "stepStatus": "completed"
}
```

**Report an error:**
```json
{
  "stepId": "market_intel",
  "stepStatus": "failed",
  "error": "Web search API rate limited. Retrying..."
}
```

**Add an asset:**
```json
{
  "asset": {
    "id": "market_intel_brief",
    "label": "Market Intelligence Brief",
    "format": "docx",
    "url": "https://storage.example.com/file.docx",
    "size": 45230,
    "category": "research"
  }
}
```

**Store research data (for use between steps):**
```json
{
  "stepId": "competitive_research",
  "stepStatus": "completed",
  "researchData": {
    "competitors": [...],
    "positioning": {...}
  }
}
```
