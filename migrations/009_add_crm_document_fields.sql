-- Add document_id and document_answers columns to crm_leads table
-- These fields are used to link leads to survey/form responses

ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS document_id UUID,
ADD COLUMN IF NOT EXISTS document_answers JSONB;

-- Index for faster lookups by document
CREATE INDEX IF NOT EXISTS idx_crm_leads_document_id ON crm_leads(document_id);
