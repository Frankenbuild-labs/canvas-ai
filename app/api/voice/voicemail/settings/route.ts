import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/database'

// GET /api/voice/voicemail/settings?phoneNumber=+15551234567
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const phoneNumber = searchParams.get('phoneNumber') || ''
    if (!phoneNumber) {
      return NextResponse.json({ ok: false, error: 'phoneNumber is required' }, { status: 400 })
    }
    const rows = await sql`
      select phone_number, greeting, ring_seconds, mode, agent_prompt
      from voicemail_settings
      where phone_number = ${phoneNumber}
      limit 1
    ` as any[]
    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        setting: {
          phoneNumber,
          greeting: 'Please leave a message after the tone.',
          ringSeconds: 0,
          mode: 'standard',
          agentPrompt: null,
        },
      })
    }
    const row = rows[0]
    return NextResponse.json({
      ok: true,
      setting: {
        phoneNumber: row.phone_number,
        greeting: row.greeting,
        ringSeconds: row.ring_seconds ?? 0,
        mode: row.mode || 'standard',
        agentPrompt: row.agent_prompt,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}

// POST /api/voice/voicemail/settings
// { phoneNumber, greeting, ringSeconds, mode?, agentPrompt? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const phoneNumber = (body.phoneNumber || '').toString()
    const greeting = (body.greeting || '').toString()
    const ringSeconds = Number(body.ringSeconds ?? 0)
    const mode = (body.mode || 'standard').toString()
    const agentPrompt = body.agentPrompt ? body.agentPrompt.toString() : null

    if (!phoneNumber || !greeting) {
      return NextResponse.json({ ok: false, error: 'phoneNumber and greeting are required' }, { status: 400 })
    }
    await sql`
      insert into voicemail_settings (phone_number, greeting, ring_seconds, mode, agent_prompt)
      values (${phoneNumber}, ${greeting}, ${ringSeconds}, ${mode}, ${agentPrompt})
      on conflict (phone_number)
      do update set
        greeting = excluded.greeting,
        ring_seconds = excluded.ring_seconds,
        mode = excluded.mode,
        agent_prompt = excluded.agent_prompt
    `
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
