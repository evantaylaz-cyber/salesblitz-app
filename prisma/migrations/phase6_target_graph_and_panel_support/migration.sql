-- Phase 6: Context Graph Architecture (Target entity, Interview Panel, Practice Session enhancements)
-- Creates Target, InterviewPanel, InterviewPanelMember tables.
-- Adds context graph columns to PracticeSession and RunRequest.

-- 1. Target entity (groups all activity per user per company/contact pair)
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactTitle" TEXT,
    "type" TEXT NOT NULL DEFAULT 'prospect',
    "roundCount" INTEGER NOT NULL DEFAULT 0,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "accumulatedIntel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Target_userId_companyName_contactName_key" ON "Target"("userId", "companyName", "contactName");
CREATE INDEX "Target_userId_idx" ON "Target"("userId");

ALTER TABLE "Target" ADD CONSTRAINT "Target_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. InterviewPanel (1:1 with RunRequest for interview_prep runs)
CREATE TABLE "InterviewPanel" (
    "id" TEXT NOT NULL,
    "runRequestId" TEXT NOT NULL,
    "roundType" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "assignment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewPanel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterviewPanel_runRequestId_key" ON "InterviewPanel"("runRequestId");

ALTER TABLE "InterviewPanel" ADD CONSTRAINT "InterviewPanel_runRequestId_fkey" FOREIGN KEY ("runRequestId") REFERENCES "RunRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. InterviewPanelMember (one per interviewer on a panel)
CREATE TABLE "InterviewPanelMember" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "roleInMeeting" TEXT NOT NULL,
    "personalityVibe" TEXT,
    "knownObjections" TEXT,
    "evaluationFocus" TEXT,
    "linkedinUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InterviewPanelMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InterviewPanelMember_panelId_idx" ON "InterviewPanelMember"("panelId");

ALTER TABLE "InterviewPanelMember" ADD CONSTRAINT "InterviewPanelMember_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "InterviewPanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Add targetId FK to RunRequest
ALTER TABLE "RunRequest" ADD COLUMN "targetId" TEXT;
ALTER TABLE "RunRequest" ADD CONSTRAINT "RunRequest_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Add context graph columns to PracticeSession
ALTER TABLE "PracticeSession" ADD COLUMN "targetId" TEXT;
ALTER TABLE "PracticeSession" ADD COLUMN "runRequestId" TEXT;
ALTER TABLE "PracticeSession" ADD COLUMN "isPanelMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PracticeSession" ADD COLUMN "panelMemberStates" JSONB;
ALTER TABLE "PracticeSession" ADD COLUMN "previousSessionId" TEXT;
ALTER TABLE "PracticeSession" ADD COLUMN "focusAreas" JSONB;
ALTER TABLE "PracticeSession" ADD COLUMN "sessionSequence" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_runRequestId_fkey" FOREIGN KEY ("runRequestId") REFERENCES "RunRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_previousSessionId_fkey" FOREIGN KEY ("previousSessionId") REFERENCES "PracticeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
