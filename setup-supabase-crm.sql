-- Supabase CRM Tables Setup
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if you want to start fresh (CAUTION: This will delete all data!)
-- Uncomment these lines only if you want to recreate tables from scratch:
-- DROP TABLE IF EXISTS public.crm_lead_list_members CASCADE;
-- DROP TABLE IF EXISTS public.crm_lead_lists CASCADE;
-- DROP TABLE IF EXISTS public.crm_leads CASCADE;

-- Create crm_leads table (using TEXT for id to match the app's UUID generation)
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT NOT NULL,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  value NUMERIC NOT NULL DEFAULT 0,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_contact TIMESTAMPTZ,
  document_id TEXT,
  document_answers JSONB
);

-- Create crm_lead_lists table
CREATE TABLE IF NOT EXISTS public.crm_lead_lists (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create crm_lead_list_members table
CREATE TABLE IF NOT EXISTS public.crm_lead_list_members (
  list_id TEXT NOT NULL REFERENCES crm_lead_lists(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (list_id, lead_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_user ON crm_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_lists_user ON crm_lead_lists(user_id);

-- Disable RLS (Row Level Security) for easier access with service_role
ALTER TABLE public.crm_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_list_members DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to service_role and authenticated roles
GRANT ALL ON public.crm_leads TO postgres, authenticated, service_role, anon;
GRANT ALL ON public.crm_lead_lists TO postgres, authenticated, service_role, anon;
GRANT ALL ON public.crm_lead_list_members TO postgres, authenticated, service_role, anon;

-- Verify tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'crm_%'
ORDER BY table_name;
