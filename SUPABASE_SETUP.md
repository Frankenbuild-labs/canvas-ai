# Supabase Database Setup for CRM

## Problem Found
**Permission denied for schema public** - This means the database tables need to be created and permissions need to be set up.

## Solution: Run this SQL in your Supabase SQL Editor

Go to: https://supabase.com/dashboard → Your Project → SQL Editor

Then run this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create crm_leads table
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create crm_lead_list_members table
CREATE TABLE IF NOT EXISTS public.crm_lead_list_members (
  list_id UUID NOT NULL REFERENCES crm_lead_lists(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (list_id, lead_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_user ON crm_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_lists_user ON crm_lead_lists(user_id);

-- Disable RLS (Row Level Security) for service role access
ALTER TABLE public.crm_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_list_members DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated and service_role
GRANT ALL ON public.crm_leads TO authenticated, service_role;
GRANT ALL ON public.crm_lead_lists TO authenticated, service_role;
GRANT ALL ON public.crm_lead_list_members TO authenticated, service_role;
```

## After Running the SQL

1. Run the test again:
   ```bash
   node test-supabase.js
   ```

2. Start your dev server:
   ```bash
   pnpm dev
   ```

3. Test uploading leads - they should now save permanently!
