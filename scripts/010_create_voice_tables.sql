-- Voice Clones Table
-- Stores user-uploaded voice clones from PlayHT
CREATE TABLE IF NOT EXISTS voice_clones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    playht_voice_id TEXT NOT NULL UNIQUE, -- PlayHT's voice ID
    voice_manifest_url TEXT, -- PlayHT voice manifest URL
    sample_audio_url TEXT NOT NULL, -- Original uploaded sample
    audio_duration_seconds DECIMAL(10, 2),
    transcript TEXT, -- Optional transcript for better cloning
    status TEXT NOT NULL DEFAULT 'processing', -- processing, ready, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_voice_clones_user_id ON voice_clones(user_id);
CREATE INDEX idx_voice_clones_status ON voice_clones(status);

-- TTS Generations Table
-- Stores generated text-to-speech audio files
CREATE TABLE IF NOT EXISTS tts_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    voice_id TEXT NOT NULL, -- Can be pre-made PlayHT voice or cloned voice ID
    voice_name TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    audio_duration_seconds DECIMAL(10, 2),
    settings JSONB NOT NULL DEFAULT '{}', -- { language, speed, temperature, quality, emotions }
    character_count INTEGER NOT NULL,
    project_id UUID, -- Optional: link to conversation project
    paragraph_index INTEGER, -- For multi-paragraph projects
    status TEXT NOT NULL DEFAULT 'generating', -- generating, ready, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tts_generations_user_id ON tts_generations(user_id);
CREATE INDEX idx_tts_generations_project_id ON tts_generations(project_id);
CREATE INDEX idx_tts_generations_status ON tts_generations(status);
CREATE INDEX idx_tts_generations_created_at ON tts_generations(created_at DESC);

-- Conversation Projects Table
-- Stores multi-speaker dialogue projects
CREATE TABLE IF NOT EXISTS conversation_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    script TEXT NOT NULL, -- Full script with speaker tags
    speaker1_voice_id TEXT NOT NULL,
    speaker1_name TEXT NOT NULL,
    speaker2_voice_id TEXT,
    speaker2_name TEXT,
    output_audio_url TEXT,
    audio_duration_seconds DECIMAL(10, 2),
    settings JSONB NOT NULL DEFAULT '{}', -- { turnPrefix, sceneDescription, language }
    status TEXT NOT NULL DEFAULT 'draft', -- draft, generating, ready, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_projects_user_id ON conversation_projects(user_id);
CREATE INDEX idx_conversation_projects_status ON conversation_projects(status);
CREATE INDEX idx_conversation_projects_updated_at ON conversation_projects(updated_at DESC);

-- User API Keys Table
-- Stores encrypted API keys for BYOK (Bring Your Own Key) model
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    service TEXT NOT NULL DEFAULT 'playht', -- playht, elevenlabs, etc
    api_key_encrypted TEXT NOT NULL,
    api_user_id_encrypted TEXT, -- For services requiring both (like PlayHT)
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_limit_characters INTEGER, -- Optional usage cap
    usage_current_characters INTEGER DEFAULT 0,
    usage_reset_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_service ON user_api_keys(service);

-- Voice Usage Tracking Table
-- Track usage for free tier limits (2,500 chars/month)
CREATE TABLE IF NOT EXISTS voice_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    characters_used INTEGER NOT NULL DEFAULT 0,
    generations_count INTEGER NOT NULL DEFAULT 0,
    clones_count INTEGER NOT NULL DEFAULT 0,
    is_byok BOOLEAN NOT NULL DEFAULT false, -- If using own API key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

CREATE INDEX idx_voice_usage_user_id ON voice_usage_tracking(user_id);
CREATE INDEX idx_voice_usage_month_year ON voice_usage_tracking(month_year);

-- Saved Voice Templates Table
-- Store commonly used voice configurations as templates
CREATE TABLE IF NOT EXISTS voice_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    voice_id TEXT NOT NULL,
    voice_name TEXT NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}', -- { language, speed, temperature, quality, emotions }
    is_public BOOLEAN NOT NULL DEFAULT false,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_voice_templates_user_id ON voice_templates(user_id);
CREATE INDEX idx_voice_templates_is_public ON voice_templates(is_public);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_voice_clones_updated_at BEFORE UPDATE ON voice_clones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_projects_updated_at BEFORE UPDATE ON conversation_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_usage_tracking_updated_at BEFORE UPDATE ON voice_usage_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_templates_updated_at BEFORE UPDATE ON voice_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
