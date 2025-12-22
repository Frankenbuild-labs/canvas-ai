import { NextRequest } from "next/server"
import { getAuthHeader, getCompatBase, requireConfigured } from "@/lib/voice/signalwire"

function normalizeAvailable(payload: any) {
  const arr = payload?.available_phone_numbers || payload?.AvailablePhoneNumbers || payload?.data || payload?.Data || payload?.items || payload?.Items || []
  const list = Array.isArray(arr) ? arr : []
  return list.map((it: any) => ({
    phoneNumber: it?.phone_number || it?.PhoneNumber || it?.phoneNumber || it?.number || it?.Number,
    friendlyName: it?.friendly_name || it?.FriendlyName || it?.friendlyName || it?.name || it?.Name || "",
    locality: it?.locality || it?.Locality || it?.RateCenter || "",
    region: it?.region || it?.Region || it?.Region || "",
    isoCountry: it?.iso_country || it?.IsoCountry || it?.country || it?.Country || "US",
  })).filter((n: any) => !!n.phoneNumber)
}

export async function GET(req: NextRequest) {
  try {
    requireConfigured()
    const base = getCompatBase()
    if (!base) return Response.json({ ok: false, error: "SignalWire not configured" }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const iso = searchParams.get("country") || "US"
    const areaCode = searchParams.get("areaCode") || ""
    const contains = searchParams.get("contains") || ""
    const type = searchParams.get("type") || "Local" // Local | TollFree
    const pageSize = searchParams.get("pageSize") || "30"

    const path = type.toLowerCase() === "tollfree"
      ? `${base}/AvailablePhoneNumbers/${iso}/TollFree.json`
      : `${base}/AvailablePhoneNumbers/${iso}/Local.json`
    const url = new URL(path)
    if (areaCode) url.searchParams.set("AreaCode", areaCode)
    if (contains) url.searchParams.set("Contains", contains)
    url.searchParams.set("PageSize", pageSize)

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { ...getAuthHeader(), Accept: "application/json" },
      cache: "no-store",
    })
    const text = await res.text()
    if (!res.ok) return Response.json({ ok: false, status: res.status, error: text.slice(0, 500) }, { status: res.status })
    let json: any
    try { json = JSON.parse(text) } catch { json = { raw: text } }
    return Response.json({ ok: true, numbers: normalizeAvailable(json), raw: json })
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
