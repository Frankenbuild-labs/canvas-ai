-- SignalWire AI Agents Table
-- Stores AI calling agents created via SignalWire SWAIG

-- Create update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS signalwire_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    assigned_number TEXT NOT NULL, -- E.164 format phone number
    settings JSONB NOT NULL DEFAULT '{}', -- { language, voice, temperature, responseStyle, etc }
    status TEXT NOT NULL DEFAULT 'inactive', -- active, inactive
    signalwire_agent_id TEXT, -- Agent ID from SignalWire API (if applicable)
    last_activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_signalwire_agents_user_id ON signalwire_agents(user_id);
CREATE INDEX idx_signalwire_agents_status ON signalwire_agents(status);
CREATE INDEX idx_signalwire_agents_assigned_number ON signalwire_agents(assigned_number);
CREATE INDEX idx_signalwire_agents_created_at ON signalwire_agents(created_at DESC);

-- Update timestamp trigger for signalwire_agents
CREATE TRIGGER update_signalwire_agents_updated_at BEFORE UPDATE ON signalwire_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
