import { NextRequest, NextResponse } from "next/server"
import { getCompatBase, getAuthHeader, requireConfigured } from "@/lib/voice/signalwire"

// List recordings with paging and simple filtering
export async function GET(req: NextRequest) {
  try {
    requireConfigured()
    const url = new URL(req.url)
    const pageSize = url.searchParams.get('pageSize') || '50'
    const page = url.searchParams.get('page') || ''
    const from = url.searchParams.get('from') || ''
    const to = url.searchParams.get('to') || ''
    // List recordings from provider (Twilio-compatible)
    let apiUrl = `${getCompatBase()}/Recordings.json?PageSize=${encodeURIComponent(pageSize)}`
    if (page) apiUrl += `&Page=${encodeURIComponent(page)}`
    const res = await fetch(apiUrl, { headers: { ...getAuthHeader() }, cache: 'no-store' })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: data }, { status: 502 })
    }

    let items = data?.recordings || data?.Recordings || data?.items || data?.Items || []
    if (!Array.isArray(items)) items = []
    // Simple client-side filter if caller/callee provided
    const filtered = items.filter((r: any) => {
      const callSid = r?.call_sid || r?.CallSid || ''
      const fromNum = r?.from || r?.From || ''
      const toNum = r?.to || r?.To || ''
      if (from && String(fromNum) !== String(from)) return false
      if (to && String(toNum) !== String(to)) return false
      return true
    })
    const nextPageUri = data?.next_page_uri || data?.NextPageUri || ''
    const previousPageUri = data?.previous_page_uri || data?.PreviousPageUri || ''
    return NextResponse.json({ ok: true, recordings: filtered, page, nextPageUri, previousPageUri })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}

// Delete a recording by SID
export async function DELETE(req: NextRequest) {
  try {
    requireConfigured()
    const url = new URL(req.url)
    const sid = url.searchParams.get('sid') || ''
    if (!sid) return NextResponse.json({ ok: false, error: 'sid required' }, { status: 400 })
    const apiUrl = `${getCompatBase()}/Recordings/${encodeURIComponent(sid)}.json`
    const res = await fetch(apiUrl, { method: 'DELETE', headers: { ...getAuthHeader() }, cache: 'no-store' })
    if (!res.ok) {
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch { data = { raw: text } }
      return NextResponse.json({ ok: false, status: res.status, error: data }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}

// Proxy download of recording media by full URL (if required by CORS)
export async function POST(req: NextRequest) {
  try {
    requireConfigured()
    const body = await req.json().catch(() => ({}))
    const mediaUrl = body?.mediaUrl || ''
    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return NextResponse.json({ ok: false, error: 'mediaUrl required' }, { status: 400 })
    }
    const res = await fetch(mediaUrl, { cache: 'no-store' })
    const buf = await res.arrayBuffer()
    return new NextResponse(Buffer.from(buf), { headers: { 'Content-Type': res.headers.get('content-type') || 'audio/mpeg' } })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
