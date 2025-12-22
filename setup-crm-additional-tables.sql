-- Additional CRM tables for surveys, custom statuses, and custom sources
-- Run this in Supabase SQL Editor

-- Surveys/Documents table
CREATE TABLE IF NOT EXISTS crm_surveys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_surveys_user ON crm_surveys(user_id);

-- Custom statuses table
CREATE TABLE IF NOT EXISTS crm_custom_statuses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_crm_custom_statuses_user ON crm_custom_statuses(user_id);

-- Custom sources table
CREATE TABLE IF NOT EXISTS crm_custom_sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source)
);

CREATE INDEX IF NOT EXISTS idx_crm_custom_sources_user ON crm_custom_sources(user_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON crm_surveys TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON crm_custom_statuses TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON crm_custom_sources TO postgres, anon, authenticated, service_role;

-- Verify tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'crm_%' ORDER BY tablename;
