import { NextRequest } from "next/server"
import { getAuthHeader, getCompatBase, requireConfigured } from "@/lib/voice/signalwire"

export async function POST(req: NextRequest) {
  try {
    requireConfigured()
    const base = getCompatBase()
    if (!base) return Response.json({ ok: false, error: "SignalWire not configured" }, { status: 500 })
    const { phoneNumber } = await req.json()
    if (!phoneNumber) return Response.json({ ok: false, error: "Missing phoneNumber" }, { status: 400 })

    // Twilio-compatible: /IncomingPhoneNumbers.json with PhoneNumber form field
    // Also set default Voice/SMS webhooks to our endpoints so inbound events reach the app.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const voiceUrl = `${baseUrl}/api/voice/sw/answer`
    const smsUrl = `${baseUrl}/api/voice/sw/sms/webhook`
    const res = await fetch(`${base}/IncomingPhoneNumbers.json`, {
      method: "POST",
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        PhoneNumber: phoneNumber,
        VoiceUrl: voiceUrl,
        VoiceMethod: "POST",
        SmsUrl: smsUrl,
        SmsMethod: "POST",
      }),
    })
    const text = await res.text()
    if (!res.ok) return Response.json({ ok: false, status: res.status, error: text.slice(0, 1000) }, { status: res.status })
    let json: any
    try { json = JSON.parse(text) } catch { json = { raw: text } }
    return Response.json({ ok: true, number: json })
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
