-- Email Marketing Tables Setup
-- Run this in Supabase SQL Editor to set up all email feature tables
-- Last Updated: December 2, 2025

-- Required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== EMAIL TEMPLATES ====================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  template_type VARCHAR(50) DEFAULT 'html',
  preview_html TEXT,
  preview_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);

-- ==================== EMAIL CAMPAIGNS ====================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  html_content TEXT,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, paused, failed
  target_list_ids TEXT[], -- Array of CRM list IDs
  target_contact_ids TEXT[], -- Array of specific contact IDs
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_user ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON email_campaigns(scheduled_for);

-- ==================== CAMPAIGN SENDS ====================
CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL, -- CRM lead ID
  contact_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  provider_message_id TEXT, -- Resend or other provider's message ID
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_email)
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_contact ON campaign_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_email ON campaign_sends(contact_email);

-- ==================== EMAIL MEDIA ====================
CREATE TABLE IF NOT EXISTS email_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  storage_bucket TEXT DEFAULT 'email-media',
  url TEXT NOT NULL, -- Public URL from Supabase Storage
  mime_type TEXT,
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  folder TEXT DEFAULT '/',
  alt_text TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_media_user ON email_media(user_id);
CREATE INDEX IF NOT EXISTS idx_email_media_folder ON email_media(folder);
CREATE INDEX IF NOT EXISTS idx_email_media_created ON email_media(created_at DESC);

-- ==================== EMAIL SETTINGS ====================
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to_email VARCHAR(255),
  company_name VARCHAR(255),
  company_address TEXT,
  website_url VARCHAR(500),
  support_email VARCHAR(255),
  brand_guidelines TEXT,
  primary_brand_color VARCHAR(7) DEFAULT '#3b82f6',
  secondary_brand_color VARCHAR(7) DEFAULT '#1e40af',
  ai_tone VARCHAR(50) DEFAULT 'Professional', -- Professional, Friendly, Casual, Formal
  privacy_policy_url VARCHAR(500),
  terms_of_service_url VARCHAR(500),
  google_analytics_id VARCHAR(100),
  email_signature TEXT,
  test_emails TEXT, -- Comma-separated emails for test sends
  smtp_config JSONB DEFAULT '{}'::JSONB,
  api_keys JSONB DEFAULT '{}'::JSONB, -- Store Resend, SendGrid, etc keys
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_settings_user ON email_settings(user_id);

-- ==================== EMAIL MESSAGES (Already exists from migration 002) ====================
-- This table should already exist from migrations/002_email_tables.sql
-- Including here for completeness and to ensure it exists

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
CREATE INDEX IF NOT EXISTS idx_email_messages_user ON email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_provider_id ON email_messages(provider_id);

-- ==================== EMAIL DOMAINS (Already exists from migration 002) ====================
-- This table should already exist from migrations/002_email_tables.sql
-- Including here for completeness and to ensure it exists

CREATE TABLE IF NOT EXISTS email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'unverified', -- unverified | verified | failed
  dns_records JSONB DEFAULT '[]'::JSONB, -- expected DNS entries for verification guidance
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_domains_status ON email_domains(status);

-- ==================== GRANT PERMISSIONS ====================
GRANT ALL PRIVILEGES ON email_templates TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON email_campaigns TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON campaign_sends TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON email_media TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON email_settings TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON email_messages TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON email_domains TO postgres, anon, authenticated, service_role;

-- ==================== VERIFY TABLES ====================
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE 'email_%' OR tablename LIKE 'campaign_%')
ORDER BY tablename;

-- Expected output:
-- campaign_sends
-- email_campaigns
-- email_domains
-- email_media
-- email_messages
-- email_settings
-- email_templates
