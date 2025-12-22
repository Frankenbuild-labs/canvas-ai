-- Add missing columns to crm_leads table
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS document_id TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS document_answers JSONB;

-- Also ensure all other expected columns exist
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_contact TIMESTAMP;
