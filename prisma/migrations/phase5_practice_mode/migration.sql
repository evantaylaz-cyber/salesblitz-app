-- Phase 5: AI Practice Mode (HeyGen Streaming Avatar)
-- Creates PracticeSession table for storing roleplay sessions, transcripts, and CotM scores.

CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCompany" TEXT NOT NULL,
    "targetRole" TEXT,
    "personaName" TEXT,
    "personaConfig" JSONB,
    "heygenSessionId" TEXT,
    "avatarId" TEXT,
    "voiceId" TEXT,
    "transcript" JSONB NOT NULL DEFAULT '[]',
    "durationSeconds" INTEGER,
    "cotmScore" JSONB,
    "feedback" TEXT,
    "outcome" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- Index for user lookup and history
CREATE INDEX "PracticeSession_userId_idx" ON "PracticeSession"("userId");
CREATE INDEX "PracticeSession_userId_createdAt_idx" ON "PracticeSession"("userId", "createdAt" DESC);
CREATE INDEX "PracticeSession_status_idx" ON "PracticeSession"("status");

-- Foreign key
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
