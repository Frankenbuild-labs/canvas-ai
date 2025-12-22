-- 007_create_user_identities.sql
-- Map device-based/browser identities to Composio user ids (and optionally to app User ids)

CREATE TABLE IF NOT EXISTS user_identities (
  device_id TEXT PRIMARY KEY,
  composio_user_id TEXT NOT NULL,
  app_user_id TEXT, -- optional reference to "User"(id)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_identities_composio ON user_identities(composio_user_id);
