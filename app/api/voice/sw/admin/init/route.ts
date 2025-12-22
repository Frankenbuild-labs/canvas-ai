import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/database'

// POST /api/voice/sw/admin/init
// Creates required voice/agent tables if they do not exist.
// Safe to run multiple times (IF NOT EXISTS guards).
export async function POST(_req: NextRequest) {
  const results: any = {}
  try {
    // signalwire_agents
    try {
      await sql(`
        CREATE TABLE IF NOT EXISTS signalwire_agents (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          agent_name TEXT NOT NULL,
          prompt TEXT NOT NULL,
          assigned_number TEXT NOT NULL,
          settings JSONB NOT NULL DEFAULT '{}'::jsonb,
          status TEXT NOT NULL DEFAULT 'inactive',
          last_activated_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_signalwire_agents_user ON signalwire_agents(user_id);
        CREATE INDEX IF NOT EXISTS idx_signalwire_agents_number ON signalwire_agents(assigned_number);
      `)
      results.signalwire_agents = 'ok'
    } catch (e: any) {
      results.signalwire_agents = 'error:' + (e?.message || String(e))
    }

    // voicemail_messages
    try {
      await sql(`
        CREATE TABLE IF NOT EXISTS voicemail_messages (
          id SERIAL PRIMARY KEY,
          agent_id TEXT,
          call_sid TEXT,
          from_number TEXT NOT NULL,
          to_number TEXT NOT NULL,
          media_url TEXT,
            duration_seconds INT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_voicemail_messages_to ON voicemail_messages(to_number);
        CREATE INDEX IF NOT EXISTS idx_voicemail_messages_from ON voicemail_messages(from_number);
        CREATE INDEX IF NOT EXISTS idx_voicemail_messages_created ON voicemail_messages(created_at);
      `)
      results.voicemail_messages = 'ok'
    } catch (e: any) {
      results.voicemail_messages = 'error:' + (e?.message || String(e))
    }

    return NextResponse.json({ ok: true, results })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err), results }, { status: 500 })
  }
}

export const GET = POST // allow GET for convenience