-- 002_email_tables.sql
-- Email feature core tables

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Outbound & inbound email messages
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  user_id TEXT, -- optional association to platform user
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  subject TEXT,
  text TEXT,
  html TEXT,
  attachments JSONB DEFAULT '[]'::JSONB, -- [{filename,mime,size_bytes}]
  provider TEXT, -- resend | local | other
  provider_id TEXT, -- id returned by provider
  status TEXT DEFAULT 'sent', -- sent | queued | failed | delivered | opened | clicked
  error TEXT, -- last provider error, if any
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_direction_created_at ON email_messages(direction, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_provider_id ON email_messages(provider_id);

-- Sender domains (for From presets)
CREATE TABLE IF NOT EXISTS email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'unverified', -- unverified | verified | failed
  dns_records JSONB DEFAULT '[]'::JSONB, -- expected DNS entries for verification guidance
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template preview metadata
CREATE TABLE IF NOT EXISTS template_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  name TEXT,
  preview_url TEXT, -- stored image or generated screenshot path
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_template_previews_template_id ON template_previews(template_id);

-- Media assets used in emails (images/files)
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  storage_path TEXT, -- bucket/key or local path
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_assets_user_id_created_at ON media_assets(user_id, created_at DESC);
