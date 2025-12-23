import { NextRequest, NextResponse } from "next/server"
import { getCompatBase, getAuthHeader, requireConfigured } from "@/lib/voice/signalwire"
import { createCallLog } from "@/lib/voice/calls-db"
import { getUserIdFromRequest } from "@/lib/auth-next"

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

export async function POST(req: NextRequest) {
  try {
    requireConfigured()
    const body = await req.json()
    const { to, tenantId, userDeviceNumber, fromNumber } = body || {}

    if (!to || !fromNumber || !userDeviceNumber) {
      return NextResponse.json({ ok: false, error: "Missing to, fromNumber, or userDeviceNumber" }, { status: 400 })
    }

    const toNorm = normalizeE164(to)
    const fromNorm = normalizeE164(fromNumber)
    const deviceNorm = normalizeE164(userDeviceNumber)
    const invalid: string[] = []
    if (!/^\+[1-9]\d{6,15}$/.test(toNorm)) invalid.push('to')
    if (!/^\+[1-9]\d{6,15}$/.test(fromNorm)) invalid.push('fromNumber')
    if (!/^\+[1-9]\d{6,15}$/.test(deviceNorm)) invalid.push('userDeviceNumber')
    if (invalid.length) {
      return NextResponse.json({ ok: false, error: 'Invalid E.164 format', invalid, hint: 'Use +15551234567 style numbers.' }, { status: 400 })
    }

    // Build answer webhook with contact param for bridging
    // Base URL used for SignalWire webhooks (must be reachable externally)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const answerUrl = `${baseUrl}/api/voice/sw/answer?contact=${encodeURIComponent(to)}`

    const url = `${getCompatBase()}/Calls.json`
    const userId = await getUserIdFromRequest(req as any)
    const statusCallback = `${baseUrl}/api/voice/sw/call/status`

    const payload = new URLSearchParams({
      From: fromNorm,
      To: deviceNorm,
      Url: answerUrl,
      StatusCallback: statusCallback,
      StatusCallbackMethod: "POST",
      Record: "true",
    })

    const debug = process.env.VOICE_DEBUG === '1'
    const startedAt = Date.now()
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
      cache: "no-store",
    })
    const text = await res.text()
    if (debug) {
      console.log('[voice.call] request', { url, payload: Object.fromEntries(payload.entries()) })
      console.log('[voice.call] response', { status: res.status, elapsedMs: Date.now() - startedAt, raw: text.slice(0, 800) })
    }
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!res.ok) {
      if (debug) console.error('[voice.call] provider error', { status: res.status, data })
      return NextResponse.json({ ok: false, status: res.status, error: data }, { status: 502 })
    }

    // Log call start
    try {
      await createCallLog({
        userId,
        contactNumber: String(toNorm),
        fromNumber: String(fromNorm),
        providerCallSid: data?.sid || data?.Sid || undefined,
        direction: 'outbound',
        status: data?.status || data?.Status || 'initiated',
        raw: data,
      })
    } catch {}

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    console.error('[voice.call] exception', err)
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
