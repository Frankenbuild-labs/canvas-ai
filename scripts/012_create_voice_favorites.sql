-- Voice Favorites Table (moved from runtime DDL to migration)
-- Tracks user's favorite TTS voices

CREATE TABLE IF NOT EXISTS voice_favorites (
  user_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, voice_id)
);

CREATE INDEX IF NOT EXISTS idx_voice_favorites_user_id ON voice_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_favorites_created_at ON voice_favorites(created_at DESC);
