CREATE TABLE IF NOT EXISTS lead_data_runs (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'streaming', 'completed', 'failed')),
  filters JSONB NOT NULL,
  metrics JSONB NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_data_runs_status_created_at
  ON lead_data_runs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_records (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES lead_data_runs(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_records_run_id_created_at
  ON lead_records (run_id, created_at DESC);
