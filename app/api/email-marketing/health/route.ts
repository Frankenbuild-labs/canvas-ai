import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/database'

async function checkDB() {
  try {
    await sql('SELECT 1')
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'db-error' }
  }
}

async function providerStatus() {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'no-resend-key' }
  try {
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${key}` }
    })
    if (!res.ok) return { ok: false, error: `resend-${res.status}` }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'resend-error' }
  }
}

export async function GET(_req: NextRequest) {
  const [db, provider] = await Promise.all([checkDB(), providerStatus()])
  // lightweight counts
  let outbox = { count: 0 }
  let inbox = { count: 0 }
  try {
    const o = await sql('SELECT COUNT(*)::int AS c FROM email_messages WHERE direction = $1', ['outbound'])
    const i = await sql('SELECT COUNT(*)::int AS c FROM email_messages WHERE direction = $1', ['inbound'])
    outbox.count = o?.[0]?.c || 0
    inbox.count = i?.[0]?.c || 0
  } catch {}
  return NextResponse.json({
    ok: db.ok && provider.ok,
    db,
    provider,
    outbox,
    inbox,
    env: {
      has_db_url: !!(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL),
      has_resend_key: !!process.env.RESEND_API_KEY,
    }
  })
}
