import { NextRequest } from "next/server"
import { getAuthHeader, getCompatBase, requireConfigured } from "@/lib/voice/signalwire"

function normalizeNumbers(payload: any) {
  // Try common shapes from Twilio-compatible APIs
  const arr = payload?.incoming_phone_numbers || payload?.IncomingPhoneNumbers || payload?.data || payload?.Data || payload?.items || payload?.Items || payload || []
  const list = Array.isArray(arr) ? arr : []
  return list
    .map((it: any) => ({
      sid: it?.sid || it?.Sid || it?.resource_sid || it?.ResourceSid,
      phoneNumber: it?.phone_number || it?.PhoneNumber || it?.phoneNumber || it?.number || it?.Number,
      friendlyName: it?.friendly_name || it?.FriendlyName || it?.friendlyName || it?.name || it?.Name || "",
      capabilities: it?.capabilities || it?.Capabilities || it?.capability || undefined,
      raw: it,
    }))
    .filter((n: any) => !!n.phoneNumber)
}

export async function GET(_req: NextRequest) {
  try {
    requireConfigured()
    const base = getCompatBase()
    if (!base) return Response.json({ ok: false, error: "SignalWire not configured" }, { status: 500 })

    const url = new URL(`${base}/IncomingPhoneNumbers.json`)
    url.searchParams.set("PageSize", "100")

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...getAuthHeader(),
        Accept: "application/json",
      },
      // Avoid Next caching for dynamic account data
      cache: "no-store",
    })

    const text = await res.text()
    if (!res.ok) {
      return Response.json({ ok: false, status: res.status, error: text.slice(0, 500) }, { status: res.status })
    }
    let json: any
    try { json = JSON.parse(text) } catch { json = { raw: text } }
    const numbers = normalizeNumbers(json)
    return Response.json({ ok: true, numbers, raw: json })
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
