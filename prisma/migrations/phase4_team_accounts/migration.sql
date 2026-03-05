-- Phase 4: Team Accounts
-- Creates Team and TeamMember tables, adds team foreign keys to existing tables

-- Create Team table
CREATE TABLE "Team" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "stripeCustomerId" TEXT,
    "currentTier" TEXT,
    "billingCycle" TEXT,
    "subscriptionRunsRemaining" INTEGER NOT NULL DEFAULT 0,
    "subscriptionRunsTotal" INTEGER NOT NULL DEFAULT 0,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'none',
    "currentPeriodEnd" TIMESTAMP(3),
    "maxSeats" INTEGER NOT NULL DEFAULT 5,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- Create TeamMember table
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "inviteEmail" TEXT NOT NULL,
    "inviteStatus" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
CREATE UNIQUE INDEX "Team_stripeCustomerId_key" ON "Team"("stripeCustomerId");
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE UNIQUE INDEX "TeamMember_teamId_inviteEmail_key" ON "TeamMember"("teamId", "inviteEmail");

-- Add foreign keys for Team
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for TeamMember
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add teamId to existing tables
ALTER TABLE "RunPack" ADD COLUMN "teamId" TEXT;
ALTER TABLE "RunPack" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "RunPack" ADD CONSTRAINT "RunPack_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RunLog" ADD COLUMN "teamId" TEXT;

ALTER TABLE "BatchJob" ADD COLUMN "teamId" TEXT;
ALTER TABLE "BatchJob" ADD CONSTRAINT "BatchJob_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RunRequest" ADD COLUMN "teamId" TEXT;
ALTER TABLE "RunRequest" ADD CONSTRAINT "RunRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KnowledgeDocument" ADD COLUMN "teamId" TEXT;
ALTER TABLE "KnowledgeDocument" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add enrichmentData column for Apollo.io (from Phase 3.4)
ALTER TABLE "RunRequest" ADD COLUMN IF NOT EXISTS "enrichmentData" JSONB;
