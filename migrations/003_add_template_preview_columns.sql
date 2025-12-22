-- 003_add_template_preview_columns.sql
-- Adds preview_html and preview_image_url columns to email_templates for gallery thumbnails
-- Safe to run multiple times (IF NOT EXISTS guards)

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS preview_html TEXT,
  ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

-- Optional index if querying by presence of preview later (lightweight)
-- CREATE INDEX IF NOT EXISTS idx_email_templates_preview_generated ON email_templates((preview_html IS NOT NULL));
