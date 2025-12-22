import { NextResponse } from "next/server"

// Proxy the OnlyOffice Document Server API script to same origin.
// This bypasses Windows localhost/firewall issues that block direct access to port 8082.
export async function GET() {
  const base = process.env.NEXT_PUBLIC_ONLYOFFICE_DOCSERVER_URL || "http://127.0.0.1:8082"
  const scriptUrl = `${base.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`
  
  try {
    const resp = await fetch(scriptUrl, { cache: "no-store" })
    if (!resp.ok) {
      return NextResponse.json({ error: `Document Server returned ${resp.status}` }, { status: resp.status })
    }
    const body = await resp.text()
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch script from Document Server" }, { status: 502 })
  }
}

export const dynamic = "force-dynamic"
