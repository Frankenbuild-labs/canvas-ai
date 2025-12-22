-- Users Table - Central user registry
-- This is the foundation table that all other tables reference
-- Run this FIRST before any other migrations

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
-- Stores all user accounts (will be populated by auth system later)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  -- Auth-related fields (for when we add Clerk/Auth.js later)
  auth_provider TEXT DEFAULT 'clerk', -- clerk, auth.js, etc.
  auth_provider_id TEXT UNIQUE, -- External auth system user ID
  -- Subscription/billing (for future SaaS features)
  subscription_tier TEXT DEFAULT 'free', -- free, pro, enterprise
  subscription_status TEXT DEFAULT 'active', -- active, cancelled, past_due
  subscription_ends_at TIMESTAMPTZ,
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider_id ON users(auth_provider_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Create a system/admin user for internal operations
INSERT INTO users (id, email, name, auth_provider, subscription_tier)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system@canvasai.internal',
  'System',
  'internal',
  'enterprise'
) ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE users IS 'Central user registry - all features reference this table';
COMMENT ON COLUMN users.auth_provider_id IS 'External auth system ID (Clerk user_*, Auth.js account ID, etc.)';
COMMENT ON COLUMN users.metadata IS 'Flexible JSON storage for user preferences, settings, etc.';
