-- Phase 0: Fix blockers — run in Supabase SQL Editor
-- Project: aaaextkrfoqomzmjjkxe
-- Date: 2026-04-20

-- 1. Add missing columns
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS name text;

-- 2. Add UPDATE policy so milestone approve/changes_requested buttons work
CREATE POLICY "users_update_own_milestones" ON milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = milestones.project_id
        AND auth.jwt() ->> 'email' = p.email
    )
  );
