import { NextResponse } from "next/server"

// Sends a message to an existing Roo task through the sidecar.
// Falls back with 400 if taskId missing or sidecar not configured.
export async function POST(req: Request) {
  const sidecarBase = (process.env.ROO_SIDECAR_URL || "").replace(/\/$/, "")
  const { taskId, message } = await req.json().catch(() => ({})) as { taskId?: string; message?: string }
  async function readConfig() {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const p = path.join(process.cwd(), '.next', 'cache', 'roo-config.json')
      const raw = await fs.readFile(p, 'utf8').catch(() => '')
      if (!raw) return { model: 'default', temperature: '0.2' }
      const parsed = JSON.parse(raw)
      return { model: parsed.model || 'default', temperature: parsed.temperature || '0.2' }
    } catch { return { model: 'default', temperature: '0.2' } }
  }
  const cfg = await readConfig()

  if (!taskId) {
    return NextResponse.json({ message: "taskId required" }, { status: 400 })
  }
  if (!sidecarBase) {
    return NextResponse.json({ error: "ROO_SIDECAR_URL not set" }, { status: 500 })
  }

  try {
    const url = `${sidecarBase}/roo/task/${encodeURIComponent(taskId)}/message`
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ text: message, extensionId: "rooveterinaryinc.roo-cline", model: cfg.model, temperature: cfg.temperature }),
    })
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `Sidecar error ${upstream.status}` }, { status: 502 })
    }

    // Pass-through SSE
    const reader = upstream.body.getReader()
    const encoder = new TextEncoder()
    let buffer = ""
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { value, done } = await reader.read()
        if (done) {
          controller.close();
          return
        }
        buffer += new TextDecoder().decode(value, { stream: true })
        const events = buffer.split(/\n\n+/)
        buffer = events.pop() || ""
        for (const raw of events) controller.enqueue(encoder.encode(raw + "\n\n"))
      },
      cancel() { reader.cancel().catch(() => {}) },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (e) {
    return NextResponse.json({ error: "Sidecar unreachable" }, { status: 502 })
  }
}
