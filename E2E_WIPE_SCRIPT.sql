-- ═══════════════════════════════════════════════════════════════════════════
-- E2E TEST DATA WIPE — Run BEFORE every E2E test session
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Purpose: Reset the test account to absolute zero. No stale blitzes,
-- no old practice sessions, no accumulated intel, no legacy artifacts.
-- Every E2E test starts from a clean slate.
--
-- Test account: evan.tay.laz@gmail.com
-- User ID: 7b922453-38a5-4c4c-b5dd-ad0962120228
--
-- CRITICAL: This script MUST be run at the start of every E2E test session.
-- Testing against stale data from old infrastructure produces false bugs.
-- ═══════════════════════════════════════════════════════════════════════════

-- Set the test user ID
DO $$
DECLARE
  test_user_id TEXT := '7b922453-38a5-4c4c-b5dd-ad0962120228';
BEGIN

  -- 1. Delete InterviewPanelMembers (FK to InterviewPanel)
  DELETE FROM "InterviewPanelMember"
  WHERE "panelId" IN (
    SELECT ip.id FROM "InterviewPanel" ip
    JOIN "RunRequest" rr ON ip."runRequestId" = rr.id
    WHERE rr."userId" = test_user_id
  );

  -- 2. Delete InterviewPanels (FK to RunRequest)
  DELETE FROM "InterviewPanel"
  WHERE "runRequestId" IN (
    SELECT id FROM "RunRequest" WHERE "userId" = test_user_id
  );

  -- 3. Delete MeetingRecordings (FK to RunRequest, Target)
  DELETE FROM "MeetingRecording" WHERE "userId" = test_user_id;

  -- 4. Delete RunDebriefs (FK to RunRequest)
  DELETE FROM "RunDebrief" WHERE "userId" = test_user_id;

  -- 5. Delete PracticeSessions (self-referencing FK: previousSessionId)
  -- Must delete in reverse order to avoid FK violations
  UPDATE "PracticeSession" SET "previousSessionId" = NULL WHERE "userId" = test_user_id;
  DELETE FROM "PracticeSession" WHERE "userId" = test_user_id;

  -- 6. Delete RunRequests (FK to BatchJob, Target)
  DELETE FROM "RunRequest" WHERE "userId" = test_user_id;

  -- 7. Delete BatchJobs
  DELETE FROM "BatchJob" WHERE "userId" = test_user_id;

  -- 8. Delete RunLogs
  DELETE FROM "RunLog" WHERE "userId" = test_user_id;

  -- 9. Delete Targets
  DELETE FROM "Target" WHERE "userId" = test_user_id;

  -- 10. Delete KnowledgeDocuments
  DELETE FROM "KnowledgeDocument" WHERE "userId" = test_user_id;

  -- 11. Delete RunPacks
  DELETE FROM "RunPack" WHERE "userId" = test_user_id;

  -- 12. Reset user_profile to blank (onboarding not completed, no data)
  UPDATE user_profile SET
    company_name = NULL,
    company_product = NULL,
    company_description = NULL,
    company_differentiators = NULL,
    company_competitors = NULL,
    company_target_market = NULL,
    linkedin_about = NULL,
    linkedin_experience = NULL,
    linkedin_education = NULL,
    selling_style = 'Value Messaging',
    deal_stories = '[]'::jsonb,
    value_props = '[]'::jsonb,
    preferred_tone = 'professional',
    onboarding_completed = false,
    company_url = NULL,
    selling_philosophy = NULL,
    seller_archetype = NULL,
    career_narrative = NULL,
    target_role_types = '[]'::jsonb,
    key_strengths = '[]'::jsonb,
    interview_history = '[]'::jsonb,
    icp_definitions = '[]'::jsonb,
    territory_focus = NULL,
    current_quota_context = NULL,
    case_studies = '[]'::jsonb,
    writing_style = NULL,
    banned_phrases = '[]'::jsonb,
    signature_patterns = '[]'::jsonb,
    lifecycle_stage = 'selling',
    onboarding_depth = 0,
    resume_text = NULL,
    updated_at = now()
  WHERE user_id = test_user_id;

  -- 13. Reset User subscription to clean Closer tier (20 runs)
  UPDATE "User" SET
    "subscriptionRunsRemaining" = 20,
    "subscriptionRunsTotal" = 20,
    "updatedAt" = now()
  WHERE id = test_user_id;

  RAISE NOTICE 'E2E wipe complete for user %', test_user_id;

END $$;
