-- 005_alter_email_media_add_dimensions.sql
-- Safely add width/height columns if they were not present (for environments
-- where migration 004 was applied before dimensions were introduced).
ALTER TABLE email_media
  ADD COLUMN IF NOT EXISTS width INT,
  ADD COLUMN IF NOT EXISTS height INT;
