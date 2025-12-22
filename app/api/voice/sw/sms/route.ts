import { NextRequest, NextResponse } from "next/server"
import { getCompatBase, getAuthHeader, requireConfigured } from "@/lib/voice/signalwire"

function normalizeE164(num: string, defaultCountry: 'US' = 'US') {
  const s = String(num || '').trim()
  // Allow SIP and URIs untouched
  if (/^sip:/i.test(s) || /^[a-z]+:/i.test(s)) return s
  // If already E.164
  if (/^\+[1-9]\d{6,15}$/.test(s)) return s
  // Digits-only normalization
  const digits = s.replace(/\D+/g, '')
  if (defaultCountry === 'US') {
    if (/^1\d{10}$/.test(digits)) return `+${digits}`
    if (/^\d{10}$/.test(digits)) return `+1${digits}`
  }
  // Fallback: return as-is to let provider validate
  return s
}

// List recent messages between two numbers (compat REST)
export async function GET(req: NextRequest) {
  try {
    requireConfigured()
    const url = new URL(req.url)
    const from = url.searchParams.get("from") || ""
    const to = url.searchParams.get("to") || ""
    const pageSize = url.searchParams.get("pageSize") || "20"

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: "Missing from or to" }, { status: 400 })
    }

    const fromNorm = normalizeE164(from)
    const toNorm = normalizeE164(to)
    const apiUrl = `${getCompatBase()}/Messages.json?From=${encodeURIComponent(fromNorm)}&To=${encodeURIComponent(toNorm)}&PageSize=${encodeURIComponent(pageSize)}`
    const debug = process.env.VOICE_DEBUG === '1'
    const startedAt = Date.now()
    const res = await fetch(apiUrl, {
      headers: { ...getAuthHeader() },
      cache: "no-store",
    })
    const text = await res.text()
    if (debug) {
      console.log('[voice.sms.list] response', { status: res.status, elapsedMs: Date.now() - startedAt, raw: text.slice(0, 400) })
    }
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    if (!res.ok) {
      const rawMsg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data).slice(0, 500)) : String(data)
      let hint = ''
      if (/invalid.*phone|E\.164/i.test(rawMsg)) hint = 'Invalid phone number format. Use E.164 like +15551234567.'
      if (/permission|unauthorized|forbidden|PSTN|not sms capable/i.test(rawMsg)) hint = 'From number may not be SMS-capable or project lacks SMS permission.'
      return NextResponse.json({ ok: false, status: res.status, error: data, errorText: rawMsg, hint }, { status: 502 })
    }
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}

// Send an SMS/MMS message
export async function POST(req: Request) {
  try {
    requireConfigured()
    const body = await req.json()
    const { from, to, text } = body || {}
    if (!from || !to || !text) {
      return NextResponse.json({ ok: false, error: "Missing from, to, or text" }, { status: 400 })
    }

    const apiUrl = `${getCompatBase()}/Messages.json`
    const fromNorm = normalizeE164(from)
    const toNorm = normalizeE164(to)
    const payload = new URLSearchParams({ From: fromNorm, To: toNorm, Body: text })
    const debug = process.env.VOICE_DEBUG === '1'
    const startedAt = Date.now()
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
      cache: "no-store",
    })
    const textRes = await res.text()
    if (debug) {
      console.log('[voice.sms.send] request', { url: apiUrl, payload: Object.fromEntries(payload.entries()) })
      console.log('[voice.sms.send] response', { status: res.status, elapsedMs: Date.now() - startedAt, raw: textRes.slice(0, 400) })
    }
    let data: any
    try { data = JSON.parse(textRes) } catch { data = { raw: textRes } }
    if (!res.ok) {
      const rawMsg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data).slice(0, 500)) : String(data)
      let hint = ''
      if (/invalid.*phone|E\.164/i.test(rawMsg)) hint = 'Invalid phone number format. Use E.164 like +15551234567.'
      if (/permission|unauthorized|forbidden|PSTN|not sms capable/i.test(rawMsg)) hint = 'From number may not be SMS-capable or project lacks SMS permission.'
      return NextResponse.json({ ok: false, status: res.status, error: data, errorText: rawMsg, hint }, { status: 502 })
    }
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    console.error('[voice.sms] exception', err)
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
