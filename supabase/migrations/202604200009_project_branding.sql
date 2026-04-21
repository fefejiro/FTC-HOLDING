-- Phase 13: Custom Branding
-- Adds a branding JSONB column to projects for white-label/agency use.
-- Shape: { companyName, primaryColor, logoUrl, tagline, replyEmail }

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS branding jsonb;

COMMENT ON COLUMN projects.branding IS
  'White-label branding per project. Keys: companyName, primaryColor (#rrggbb), logoUrl (https), tagline, replyEmail.';
