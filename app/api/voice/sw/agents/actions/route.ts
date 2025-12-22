import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/database'

function normalizeE164(num: string, defaultCountry: 'US' = 'US') {
  const s = String(num || '').trim()
  if (/^sip:/i.test(s) || /^[a-z]+:/i.test(s)) return s
  if (/^\+[1-9]\d{6,15}$/.test(s)) return s
  const digits = s.replace(/\D+/g, '')
  if (defaultCountry === 'US') {
    if (/^1\d{10}$/.test(digits)) return `+${digits}`
    if (/^\d{10}$/.test(digits)) return `+1${digits}`
  }
  return s
}

async function getAgent(id: string) {
  const rows = await sql`select * from signalwire_agents where id = ${id}`
  return rows?.[0] || null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentId, action, to, text } = body || {}
    if (!agentId || !action) {
      return NextResponse.json({ error: 'agentId and action required' }, { status: 400 })
    }
    const agent = await getAgent(agentId)
    if (!agent) {
      return NextResponse.json({ error: 'agent not found' }, { status: 404 })
    }
    const fromNumber = agent.assigned_number || ''
    if (!fromNumber) {
      return NextResponse.json({ error: 'agent has no assigned number' }, { status: 400 })
    }

    if (action === 'call') {
      const dest = normalizeE164(String(to || ''))
      if (!dest) return NextResponse.json({ error: 'invalid destination' }, { status: 400 })
      const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'
      const res = await fetch(`${base}/api/voice/sw/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromNumber, to: dest }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return NextResponse.json({ error: 'call failed', detail: data }, { status: res.status })
      return NextResponse.json({ ok: true, call: data })
    }

    if (action === 'sms') {
      const dest = normalizeE164(String(to || ''))
      if (!dest || !text) return NextResponse.json({ error: 'invalid destination or text missing' }, { status: 400 })
      const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'
      const res = await fetch(`${base}/api/voice/sw/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromNumber, to: dest, body: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return NextResponse.json({ error: 'sms failed', detail: data }, { status: res.status })
      return NextResponse.json({ ok: true, message: data })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'unexpected', detail: String(e?.message || e) }, { status: 500 })
  }
}
