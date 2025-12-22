import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { agentId, callSid, from, to, mediaUrl, duration, createdAt } = body || {}
    if (!from || !to) return NextResponse.json({ ok: false, error: 'from and to required' }, { status: 400 })
    // Attempt to persist into voicemail_messages table if present; otherwise no-op
    try {
      await sql`
        insert into voicemail_messages (agent_id, call_sid, from_number, to_number, media_url, duration_seconds, created_at)
        values (${agentId || null}, ${callSid || null}, ${from}, ${to}, ${mediaUrl || null}, ${duration || null}, ${createdAt || new Date().toISOString()})
      `
    } catch (e) {
      console.warn('[voicemail.save] insert failed (table may not exist)', e)
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
