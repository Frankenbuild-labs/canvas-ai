-- Create voice_favorites table
CREATE TABLE IF NOT EXISTS voice_favorites (
  user_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, voice_id)
);

CREATE INDEX IF NOT EXISTS idx_voice_favorites_user ON voice_favorites(user_id);
