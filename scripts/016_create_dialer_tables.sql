-- =====================================================
-- Dialer Feature Production Tables
-- Created: 2025-12-03
-- Purpose: Add call dispositions, recordings metadata, SMS tracking, and campaign functionality
-- =====================================================

-- Add lead_id to existing call_logs table
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id);

-- =====================================================
-- CALL DISPOSITIONS
-- Track call outcomes and follow-up actions
-- =====================================================
CREATE TABLE IF NOT EXISTS call_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  disposition_type TEXT NOT NULL,
  -- Values: answered, voicemail, busy, no_answer, wrong_number, callback_requested, not_interested, interested, do_not_call
  notes TEXT,
  next_action TEXT, -- call_back, send_email, send_sms, schedule_meeting, mark_dead, none
  follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- user_id
);

CREATE INDEX idx_call_dispositions_call_log ON call_dispositions(call_log_id);
CREATE INDEX idx_call_dispositions_follow_up ON call_dispositions(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX idx_call_dispositions_type ON call_dispositions(disposition_type);

COMMENT ON TABLE call_dispositions IS 'Tracks call outcomes and follow-up actions for dialer calls';
COMMENT ON COLUMN call_dispositions.disposition_type IS 'answered, voicemail, busy, no_answer, wrong_number, callback_requested, not_interested, interested, do_not_call';
COMMENT ON COLUMN call_dispositions.next_action IS 'call_back, send_email, send_sms, schedule_meeting, mark_dead, none';

-- =====================================================
-- CALL RECORDINGS METADATA
-- Better organization and searchability for call recordings
-- =====================================================
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcription_text TEXT,
  transcription_url TEXT,
  transcription_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_recordings_call_log ON call_recordings(call_log_id);
CREATE INDEX idx_call_recordings_created ON call_recordings(created_at DESC);

COMMENT ON TABLE call_recordings IS 'Metadata for call recordings with transcription support';

-- =====================================================
-- SMS MESSAGES
-- Track all SMS conversations linked to CRM leads
-- =====================================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  contact_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('inbound','outbound')) NOT NULL,
  message_body TEXT NOT NULL,
  provider_message_sid TEXT UNIQUE,
  status TEXT, -- queued, sent, delivered, failed, received
  media_urls JSONB, -- Array of media URLs for MMS
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_messages_user ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_lead ON sms_messages(lead_id);
CREATE INDEX idx_sms_messages_contact ON sms_messages(contact_number);
CREATE INDEX idx_sms_messages_created ON sms_messages(created_at DESC);
CREATE INDEX idx_sms_messages_direction ON sms_messages(direction);

COMMENT ON TABLE sms_messages IS 'All SMS/MMS messages sent and received through dialer';
COMMENT ON COLUMN sms_messages.media_urls IS 'Array of media URLs for MMS attachments';

-- =====================================================
-- DIALER CAMPAIGNS
-- Power dialer campaign management
-- =====================================================
CREATE TABLE IF NOT EXISTS dialer_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  list_id UUID NOT NULL REFERENCES crm_lead_lists(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed, archived
  dial_mode TEXT DEFAULT 'preview', -- preview, progressive, predictive
  from_number TEXT,
  max_attempts INTEGER DEFAULT 3,
  retry_delay_hours INTEGER DEFAULT 24,
  skip_do_not_call BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dialer_campaigns_user ON dialer_campaigns(user_id);
CREATE INDEX idx_dialer_campaigns_status ON dialer_campaigns(status);
CREATE INDEX idx_dialer_campaigns_list ON dialer_campaigns(list_id);

COMMENT ON TABLE dialer_campaigns IS 'Power dialer campaigns for bulk calling';
COMMENT ON COLUMN dialer_campaigns.dial_mode IS 'preview: manual dial, progressive: auto-advance, predictive: predictive dialing';

-- =====================================================
-- DIALER CAMPAIGN CALLS
-- Track progress through campaign call list
-- =====================================================
CREATE TABLE IF NOT EXISTS dialer_campaign_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES dialer_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
  attempt_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- pending, called, skipped, completed
  skip_reason TEXT, -- do_not_call, no_phone, max_attempts, manual_skip
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, lead_id)
);

CREATE INDEX idx_campaign_calls_campaign ON dialer_campaign_calls(campaign_id);
CREATE INDEX idx_campaign_calls_lead ON dialer_campaign_calls(lead_id);
CREATE INDEX idx_campaign_calls_status ON dialer_campaign_calls(status);
CREATE INDEX idx_campaign_calls_retry ON dialer_campaign_calls(next_retry_at) WHERE status = 'pending';
CREATE INDEX idx_campaign_calls_call_log ON dialer_campaign_calls(call_log_id);

COMMENT ON TABLE dialer_campaign_calls IS 'Tracks which leads have been called in each campaign';

-- =====================================================
-- UPDATE TRIGGERS
-- Auto-update timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_dialer_campaigns_updated_at ON dialer_campaigns;
CREATE TRIGGER update_dialer_campaigns_updated_at
    BEFORE UPDATE ON dialer_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dialer_campaign_calls_updated_at ON dialer_campaign_calls;
CREATE TRIGGER update_dialer_campaign_calls_updated_at
    BEFORE UPDATE ON dialer_campaign_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PERMISSIONS (Supabase RLS)
-- Grant appropriate permissions
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE call_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialer_campaign_calls ENABLE ROW LEVEL SECURITY;

-- Call Dispositions: Users can only access their own dispositions via call_logs
DROP POLICY IF EXISTS call_dispositions_user_policy ON call_dispositions;
CREATE POLICY call_dispositions_user_policy ON call_dispositions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM call_logs 
      WHERE call_logs.id = call_dispositions.call_log_id 
      AND call_logs.user_id = auth.uid()::text
    )
  );

-- Call Recordings: Users can only access their own recordings via call_logs
DROP POLICY IF EXISTS call_recordings_user_policy ON call_recordings;
CREATE POLICY call_recordings_user_policy ON call_recordings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM call_logs 
      WHERE call_logs.id = call_recordings.call_log_id 
      AND call_logs.user_id = auth.uid()::text
    )
  );

-- SMS Messages: Users can only access their own messages
DROP POLICY IF EXISTS sms_messages_user_policy ON sms_messages;
CREATE POLICY sms_messages_user_policy ON sms_messages
  FOR ALL
  USING (user_id = auth.uid()::text);

-- Dialer Campaigns: Users can only access their own campaigns
DROP POLICY IF EXISTS dialer_campaigns_user_policy ON dialer_campaigns;
CREATE POLICY dialer_campaigns_user_policy ON dialer_campaigns
  FOR ALL
  USING (user_id = auth.uid()::text);

-- Campaign Calls: Users can only access calls in their own campaigns
DROP POLICY IF EXISTS dialer_campaign_calls_user_policy ON dialer_campaign_calls;
CREATE POLICY dialer_campaign_calls_user_policy ON dialer_campaign_calls
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dialer_campaigns 
      WHERE dialer_campaigns.id = dialer_campaign_calls.campaign_id 
      AND dialer_campaigns.user_id = auth.uid()::text
    )
  );

-- =====================================================
-- HELPER VIEWS
-- Convenient views for common queries
-- =====================================================

-- View: Recent calls with disposition and lead info
CREATE OR REPLACE VIEW v_call_history AS
SELECT 
  cl.id,
  cl.user_id,
  cl.lead_id,
  cl.contact_number,
  cl.from_number,
  cl.direction,
  cl.status,
  cl.started_at,
  cl.ended_at,
  cl.duration_seconds,
  cl.recording_url,
  cd.disposition_type,
  cd.notes as disposition_notes,
  cd.next_action,
  cd.follow_up_date,
  l.name as lead_name,
  l.email as lead_email,
  l.company as lead_company,
  l.status as lead_status,
  cr.transcription_text
FROM call_logs cl
LEFT JOIN call_dispositions cd ON cd.call_log_id = cl.id
LEFT JOIN crm_leads l ON l.id = cl.lead_id
LEFT JOIN call_recordings cr ON cr.call_log_id = cl.id;

COMMENT ON VIEW v_call_history IS 'Combined view of calls with dispositions, lead info, and transcriptions';

-- View: SMS conversations with lead info
CREATE OR REPLACE VIEW v_sms_conversations AS
SELECT 
  sm.id,
  sm.user_id,
  sm.lead_id,
  sm.contact_number,
  sm.from_number,
  sm.direction,
  sm.message_body,
  sm.status,
  sm.media_urls,
  sm.sent_at,
  sm.created_at,
  l.name as lead_name,
  l.email as lead_email,
  l.company as lead_company
FROM sms_messages sm
LEFT JOIN crm_leads l ON l.id = sm.lead_id
ORDER BY sm.created_at DESC;

COMMENT ON VIEW v_sms_conversations IS 'SMS messages with lead context';

-- View: Campaign progress summary
CREATE OR REPLACE VIEW v_campaign_progress AS
SELECT 
  dc.id as campaign_id,
  dc.name as campaign_name,
  dc.user_id,
  dc.status as campaign_status,
  dc.dial_mode,
  dc.started_at,
  COUNT(dcc.id) as total_leads,
  COUNT(CASE WHEN dcc.status = 'pending' THEN 1 END) as pending_calls,
  COUNT(CASE WHEN dcc.status = 'called' THEN 1 END) as completed_calls,
  COUNT(CASE WHEN dcc.status = 'skipped' THEN 1 END) as skipped_calls,
  COUNT(CASE WHEN dcc.call_log_id IS NOT NULL THEN 1 END) as calls_made,
  AVG(CASE WHEN cl.duration_seconds IS NOT NULL THEN cl.duration_seconds END) as avg_call_duration
FROM dialer_campaigns dc
LEFT JOIN dialer_campaign_calls dcc ON dcc.campaign_id = dc.id
LEFT JOIN call_logs cl ON cl.id = dcc.call_log_id
GROUP BY dc.id, dc.name, dc.user_id, dc.status, dc.dial_mode, dc.started_at;

COMMENT ON VIEW v_campaign_progress IS 'Campaign statistics and progress tracking';

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Dialer tables created successfully!';
  RAISE NOTICE '📊 Tables: call_dispositions, call_recordings, sms_messages, dialer_campaigns, dialer_campaign_calls';
  RAISE NOTICE '🔒 Row Level Security policies enabled';
  RAISE NOTICE '👁️  Helper views: v_call_history, v_sms_conversations, v_campaign_progress';
  RAISE NOTICE '🔗 Added lead_id column to call_logs table';
END $$;
