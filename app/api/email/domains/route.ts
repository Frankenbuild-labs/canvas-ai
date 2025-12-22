import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/database'

// Hybrid domain management:
// - We store desired domains in email_domains table.
// - We optionally sync with Resend provider to reflect verification status.

async function fetchResendDomains(): Promise<Record<string, any>> {
  const key = process.env.RESEND_API_KEY
  if (!key) return {}
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${key}` },
      cache: 'no-store'
    })
    if (!res.ok) return {}
    const json = await res.json().catch(()=>({}))
    const items = (json?.data || json?.domains || [])
    const map: Record<string, any> = {}
    for (const d of items) {
      const name = d.name || d.domain?.name
      if (!name) continue
      map[name.toLowerCase()] = d
    }
    return map
  } catch { return {} }
}

async function listLocalDomains() {
  try {
    return await sql('SELECT id, name, status, dns_records, last_checked, created_at, updated_at FROM email_domains ORDER BY created_at DESC')
  } catch {
    return []
  }
}

export async function GET() {
  const local = await listLocalDomains()
  const providerMap = await fetchResendDomains()
  const domains = local.map(d => {
    const prov = providerMap[d.name.toLowerCase()]
    const status = prov?.status || d.status || 'unknown'
    const records = prov?.records || prov?.dns || d.dns_records || []
    return {
      id: d.id,
      name: d.name,
      status,
      created_at: d.created_at,
      records
    }
  })
  return NextResponse.json({ ok: true, domains })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(()=>({}))
    const name = String(body.name || '').trim().toLowerCase()
    if (!name) return NextResponse.json({ ok: false, error: 'missing-name' }, { status: 400 })
    // Insert or ignore if already present
    try {
      await sql(
        `INSERT INTO email_domains (name, status) VALUES ($1, 'unverified')
         ON CONFLICT (name) DO NOTHING`,
        [name]
      )
    } catch {}
    // Optionally create on provider
    const key = process.env.RESEND_API_KEY
    if (key) {
      try {
        const res = await fetch('https://api.resend.com/domains', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        })
        // Swallow provider errors; user can retry
        if (!res.ok) {
          const txt = await res.text()
          return NextResponse.json({ ok: true, warning: `provider-error-${res.status}`, detail: txt })
        }
      } catch (e: any) {
        return NextResponse.json({ ok: true, warning: 'provider-error', detail: e?.message })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'create-failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(()=>({}))
    const name = String(body.name || '').trim().toLowerCase()
    const status = body.status ? String(body.status) : undefined
    if (!name || !status) return NextResponse.json({ ok: false, error: 'missing-fields' }, { status: 400 })
    await sql('UPDATE email_domains SET status = $1, updated_at = NOW() WHERE name = $2', [status, name])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'update-failed' }, { status: 500 })
  }
}
