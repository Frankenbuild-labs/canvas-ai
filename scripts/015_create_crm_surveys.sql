-- CRM Surveys schema to manage fillable surveys
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS crm_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL, -- { questions: [{ key, label, type, options? }] }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_surveys_user ON crm_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_surveys_created_at ON crm_surveys(created_at DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_crm_surveys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_surveys_updated_at ON crm_surveys;
CREATE TRIGGER crm_surveys_updated_at
  BEFORE UPDATE ON crm_surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_surveys_updated_at();
