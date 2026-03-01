-- Phase 1: Add execution tracking to RunRequest
-- Adds step-by-step progress tracking, asset manifest, and research data storage

-- Add new columns to RunRequest
ALTER TABLE "RunRequest" ADD COLUMN "currentStep" TEXT;
ALTER TABLE "RunRequest" ADD COLUMN "steps" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "RunRequest" ADD COLUMN "assets" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "RunRequest" ADD COLUMN "researchData" JSONB;
ALTER TABLE "RunRequest" ADD COLUMN "errorMessage" TEXT;

-- Update status enum to include new intermediate states
-- (status is a string field, not an enum, so we just need to update existing values if needed)
-- New valid statuses: submitted | researching | generating | ready | delivered | failed

-- Migrate any existing "in_progress" statuses to "researching" for consistency
UPDATE "RunRequest" SET status = 'researching' WHERE status = 'in_progress';
