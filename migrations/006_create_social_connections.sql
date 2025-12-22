-- 006_create_social_connections.sql
-- Track third-party connection records (Composio, Pathfix, etc.) per user

CREATE TABLE IF NOT EXISTS social_connections (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- e.g., 'composio', 'pathfix'
  toolkit_slug TEXT,      -- e.g., composio toolkit slug
  platform TEXT,          -- normalized platform name (twitter, instagram, etc.)
  connection_id TEXT,     -- provider connection identifier
  status TEXT,            -- ACTIVE, INACTIVE, EXPIRED, etc.
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, connection_id)
);

CREATE INDEX IF NOT EXISTS idx_social_connections_user ON social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON social_connections(platform);
