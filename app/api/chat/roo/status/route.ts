import { NextResponse } from "next/server"

// Lightweight health + config probe for Roo sidecar connectivity.
// Returns whether the sidecar env var is set and if basic network reachability works.
// This helps explain why the main /api/chat/roo route might fall back to mock.
//
// Response shape:
// {
//   sidecarConfigured: boolean,
//   sidecarUrl: string | null,
//   reachable: boolean,
//   upstreamStatus?: number,
//   notes: string[]
// }
export async function GET() {
  const baseRaw = process.env.ROO_SIDECAR_URL || ""
  const sidecarBase = baseRaw.replace(/\/$/, "")
  const notes: string[] = []
  if (!sidecarBase) {
    notes.push("ROO_SIDECAR_URL not set in environment.")
    return NextResponse.json({
      sidecarConfigured: false,
      sidecarUrl: null,
      reachable: false,
      notes,
    })
  }

  // We attempt a very cheap fetch to detect network reachability. We don't assume a health endpoint exists.
  // Strategy: try GET sidecarBase (may 404). Any response (even 404/401) counts as reachable; only network errors are unreachable.
  let reachable = false
  let upstreamStatus: number | undefined = undefined
  try {
    const res = await fetch(sidecarBase, { method: "GET" })
    upstreamStatus = res.status
    reachable = true // any HTTP response means TCP/connect succeeded
    notes.push(`Received HTTP status ${res.status} from base.`)
  } catch (e: any) {
    notes.push(`Network error: ${(e && e.message) || "unknown"}`)
  }

  let taskCreateOk: boolean | null = null
  let taskCreateStatus: number | undefined = undefined
  let taskCreateError: string | undefined = undefined

  if (reachable) {
    notes.push("Sidecar base reachable.")
    // Optional deeper probe: perform a lightweight POST to /roo/task with a benign message.
    // Only attempt if query param deep=1 provided later when we support it; for now always attempt but tolerate failure.
    try {
      const createUrl = `${sidecarBase}/roo/task`
      const res = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ text: "diagnostic probe", extensionId: "rooveterinaryinc.roo-cline" }),
      })
      taskCreateStatus = res.status
      if (res.ok && res.body) {
        taskCreateOk = true
        notes.push(`Task creation probe succeeded (status ${res.status}).`)
        // Consume just first chunk then cancel to avoid holding open SSE.
        try {
          const reader = res.body.getReader()
          await reader.read() // one chunk
          reader.cancel().catch(() => {})
        } catch {}
      } else {
        taskCreateOk = false
        notes.push(`Task creation probe failed (status ${res.status}).`)
      }
    } catch (e: any) {
      taskCreateOk = false
      taskCreateError = e?.message || "unknown error"
      notes.push(`Task creation probe network error: ${taskCreateError}`)
    }
  } else {
    notes.push("Sidecar not reachable. Confirm the sidecar process is running and port accessible from Next.js server.")
  }

  return NextResponse.json({
    sidecarConfigured: true,
    sidecarUrl: sidecarBase,
    reachable,
    upstreamStatus,
    taskCreateOk,
    taskCreateStatus,
    taskCreateError,
    notes,
  })
}
