import { NextRequest, NextResponse } from 'next/server'
import { broadcastSMS } from '@/lib/voice/sms-events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Expect application/x-www-form-urlencoded
    const text = await req.text()
    const params = new URLSearchParams(text)
    const From = params.get('From') || ''
    const To = params.get('To') || ''
    const Body = params.get('Body') || ''

    // Optionally validate signature in production (X-SignalWire-Signature)
    // Skipped for brevity here.

    if (From && To) {
      broadcastSMS({ from: From, to: To, body: Body, direction: 'inbound', raw: Object.fromEntries(params.entries()) })
    }

    // Respond with empty TwiML-compatible XML
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'webhook error' }, { status: 500 })
  }
}
