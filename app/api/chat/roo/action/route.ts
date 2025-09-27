import { NextResponse } from "next/server"

// Perform an action on an existing Roo task (approve / reject / cancel / resume / pressPrimaryButton / pressSecondaryButton).
export async function POST(req: Request) {
  const sidecarBase = (process.env.ROO_SIDECAR_URL || "").replace(/\/$/, "")
  const { taskId, action } = await req.json().catch(() => ({})) as { taskId?: string; action?: string }

  if (!taskId || !action) {
    return NextResponse.json({ error: "taskId and action required" }, { status: 400 })
  }
  if (!sidecarBase) {
    return NextResponse.json({ error: "ROO_SIDECAR_URL not set" }, { status: 500 })
  }
  try {
    const url = `${sidecarBase}/roo/task/${encodeURIComponent(taskId)}/action`
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, extensionId: "rooveterinaryinc.roo-cline" }),
    })
    const json = await upstream.json().catch(() => ({}))
    if (!upstream.ok) {
      return NextResponse.json({ error: json.message || `Sidecar error ${upstream.status}` }, { status: 502 })
    }
    return NextResponse.json(json)
  } catch (e) {
    return NextResponse.json({ error: "Sidecar unreachable" }, { status: 502 })
  }
}
