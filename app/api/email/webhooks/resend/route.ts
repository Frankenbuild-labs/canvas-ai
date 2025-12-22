import { NextRequest, NextResponse } from 'next/server'
import { EmailDB } from '@/lib/email-db'

// Minimal Resend webhook handler (Svix signature verification not implemented here)
// Configure this endpoint in Resend dashboard: POST /api/email/webhooks/resend
// Optionally set RESEND_WEBHOOK_SECRET and add proper verification later.

function mapStatus(type: string): { status: string; error?: string } {
  const t = type.toLowerCase()
  if (t.includes('delivered')) return { status: 'delivered' }
  if (t.includes('opened')) return { status: 'opened' }
  if (t.includes('clicked')) return { status: 'clicked' }
  if (t.includes('bounced')) return { status: 'failed', error: 'bounced' }
  if (t.includes('complained')) return { status: 'failed', error: 'complained' }
  if (t.includes('rejected')) return { status: 'failed', error: 'rejected' }
  if (t.includes('deferred')) return { status: 'queued' }
  if (t.includes('sent')) return { status: 'sent' }
  return { status: 'unknown' }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    // Resend events typically: { type: 'email.delivered', data: { id: '...' , ... } }
    const type = String(json?.type || '')
    const provider_id = String(json?.data?.id || json?.data?.email?.id || '')
    if (!provider_id) return NextResponse.json({ ok: false, error: 'missing-provider-id' }, { status: 400 })
    const { status, error } = mapStatus(type)
    await EmailDB.updateStatusByProviderId(provider_id, status, error)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'webhook-error' }, { status: 500 })
  }
}
