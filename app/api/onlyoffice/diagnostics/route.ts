import { NextResponse } from "next/server"

// Simple diagnostics endpoint to help determine why OnlyOffice editor fails to load.
// It performs server-side fetch attempts to the Document Server healthcheck and api.js script.
// Returns structured JSON with timings and error messages to surface root causes in the UI.
export async function GET() {
  const base = process.env.NEXT_PUBLIC_ONLYOFFICE_DOCSERVER_URL || "http://127.0.0.1:8082"
  const healthUrl = base.replace(/\/$/, "") + "/healthcheck"
  const scriptUrl = base.replace(/\/$/, "") + "/web-apps/apps/api/documents/api.js"
  const out: any = { base, health: null, script: null, timestamp: Date.now() }

  // Helper to time a fetch
  async function timedFetch(label: string, url: string, opts?: RequestInit) {
    const start = performance.now()
    try {
      const resp = await fetch(url, { method: "GET", cache: "no-store", ...opts })
      const dur = performance.now() - start
      return { ok: resp.ok, status: resp.status, durationMs: Math.round(dur), error: null }
    } catch (e: any) {
      const dur = performance.now() - start
      return { ok: false, status: 0, durationMs: Math.round(dur), error: e?.message || String(e) }
    }
  }

  out.health = await timedFetch("health", healthUrl)
  out.script = await timedFetch("script", scriptUrl, { method: "HEAD" })

  // If script HEAD failed, attempt GET for more detailed error
  if (!out.script.ok) {
    out.scriptGet = await timedFetch("scriptGet", scriptUrl)
  }

  // Include env hints
  out.env = {
    ONLYOFFICE_JWT_SET: !!process.env.ONLYOFFICE_JWT_SECRET,
    CALLBACK_BASE: process.env.ONLYOFFICE_CALLBACK_BASE_URL || null,
    FILE_BASE: process.env.ONLYOFFICE_FILE_BASE_URL || null,
  }

  return NextResponse.json(out, { status: 200 })
}

export const dynamic = "force-dynamic"
