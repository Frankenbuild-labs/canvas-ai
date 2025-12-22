-- Add document assignment and answers to CRM leads
ALTER TABLE IF EXISTS crm_leads
  ADD COLUMN IF NOT EXISTS document_id TEXT,
  ADD COLUMN IF NOT EXISTS document_answers JSONB;
