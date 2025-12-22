-- 004_create_email_media.sql
-- Dedicated media table for email/media library persistence
-- Requires pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS email_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  url TEXT NOT NULL,
  type TEXT,
  size_bytes BIGINT,
  folder TEXT,
  alt_text TEXT,
  width INT,
  height INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_media_folder_created_at ON email_media(folder, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_media_created_at ON email_media(created_at DESC);