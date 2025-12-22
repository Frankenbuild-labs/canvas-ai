-- Creative Studio Projects and Settings Tables
-- Purpose: Store design/video projects, auto-save state, and user preferences

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Studio Projects table
-- Stores individual design/video projects with scene data
CREATE TABLE IF NOT EXISTS studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  type TEXT NOT NULL CHECK (type IN ('design', 'video')),
  scene_data TEXT NOT NULL, -- CESDK scene UBQ string from saveToString()
  thumbnail TEXT, -- Base64 or URL to thumbnail image
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_studio_projects_user_id ON studio_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_projects_updated_at ON studio_projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_projects_type ON studio_projects(type);

-- Studio Settings table
-- Stores user preferences and last state
CREATE TABLE IF NOT EXISTS studio_settings (
  user_id UUID PRIMARY KEY,
  active_tab TEXT NOT NULL DEFAULT 'design' CHECK (active_tab IN ('design', 'video')),
  last_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  auto_save_enabled BOOLEAN DEFAULT true,
  auto_save_interval INTEGER DEFAULT 5000, -- milliseconds
  preferences JSONB DEFAULT '{}'::jsonb, -- zoom, panel states, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_studio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER studio_projects_updated_at
  BEFORE UPDATE ON studio_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_studio_updated_at();

CREATE TRIGGER studio_settings_updated_at
  BEFORE UPDATE ON studio_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_studio_updated_at();

-- Comments for documentation
COMMENT ON TABLE studio_projects IS 'Stores design and video projects with CESDK scene data';
COMMENT ON TABLE studio_settings IS 'User preferences and state for creative studio';
COMMENT ON COLUMN studio_projects.scene_data IS 'CESDK scene UBQ string from engine.scene.saveToString()';
COMMENT ON COLUMN studio_projects.thumbnail IS 'Project preview image (base64 or URL)';
COMMENT ON COLUMN studio_settings.preferences IS 'JSON object with zoom, panels, theme, etc.';
