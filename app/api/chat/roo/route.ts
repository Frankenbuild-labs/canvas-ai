/**
 * Roo Integration Route
 * ---------------------
 * Attempts to proxy to an Agent Maestro sidecar (Roo routes) for a real task.
 * If the sidecar is unreachable, falls back to a local mock SSE stream.
 *
 * Env:
 *  ROO_SIDECAR_URL = http://localhost:23333/api/v1  (Agent Maestro base)
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { message?: string }
  const message = body.message || ""
  const sidecarBase = (process.env.ROO_SIDECAR_URL || "").replace(/\/$/, "")
  const encoder = new TextEncoder()
  // Lazy import file ops only when needed (avoid cold start cost if route not hit)
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

  if (!sidecarBase) {
    console.log("[roo] ROO_SIDECAR_URL not set; cannot create task")
    return new Response(JSON.stringify({ error: "ROO_SIDECAR_URL not set" }), { status: 500 })
  }

  // First verify Agent Maestro is reachable
  console.log("[roo] checking Agent Maestro connectivity...")
  try {
    const healthCheck = await fetch(`${sidecarBase.replace('/api/v1', '')}/openapi.json`, { 
      method: "GET", 
      signal: AbortSignal.timeout(5000)
    })
    console.log("[roo] health check status:", healthCheck.status)
  } catch (healthError) {
    console.error("[roo] health check failed:", healthError)
  }

  // Attempt real sidecar task creation
  try {
    const createUrl = `${sidecarBase}/roo/task`
    console.log("[roo] attempting sidecar task create", createUrl)
    console.log("[roo] request body:", { text: message, extensionId: "rooveterinaryinc.roo-cline", model: cfg.model, temperature: cfg.temperature })
    
    const upstream = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        text: message,
        extensionId: "rooveterinaryinc.roo-cline",
        model: cfg.model,
        temperature: cfg.temperature,
      }),
    })
    
    console.log("[roo] upstream response status:", upstream.status)
    console.log("[roo] upstream response headers:", Object.fromEntries(upstream.headers.entries()))
    console.log("[roo] upstream.ok:", upstream.ok, "upstream.body exists:", !!upstream.body)
    
    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "Unable to read error")
      console.log("[roo] upstream error text:", errorText)
    }

    if (!upstream.ok || !upstream.body) {
      console.log("[roo] sidecar task create failed status=", upstream.status)
      return new Response(JSON.stringify({ error: `Sidecar error ${upstream.status}` }), { status: 502 })
    }

    console.log("[roo] starting SSE stream processing...")
    const reader = upstream.body.getReader()
    let buffer = ""
    let eventCount = 0
    let hasReceivedAnyData = false

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { value, done } = await reader.read()
          
          if (done) {
            console.log(`[roo] SSE stream ended. Total events: ${eventCount}, received any data: ${hasReceivedAnyData}`)
            if (buffer.length > 0) {
              console.log("[roo] remaining buffer on close:", JSON.stringify(buffer))
            }
            controller.close()
            return
          }
          
          if (value && value.length > 0) {
            hasReceivedAnyData = true
            const chunk = new TextDecoder().decode(value, { stream: true })
            console.log("[roo] raw chunk received:", JSON.stringify(chunk))
            buffer += chunk
            
            const events = buffer.split(/\n\n+/)
            buffer = events.pop() || ""
            
            for (const raw of events) {
              if (raw.trim()) {
                eventCount++
                console.log(`[roo] EVENT #${eventCount}:`, JSON.stringify(raw))
                
                // Parse SSE structure
                const lines = raw.split('\n')
                let eventType = null
                let data = null
                for (const line of lines) {
                  if (line.startsWith('event:')) eventType = line.slice(6).trim()
                  if (line.startsWith('data:')) data = line.slice(5).trim()
                }
                console.log(`[roo] -> Type: "${eventType}", Data:`, data ? data.substring(0, 200) + (data.length > 200 ? "..." : "") : null)
                
                // Forward to frontend
                const encoded = encoder.encode(raw + "\n\n")
                console.log(`[roo] forwarding ${encoded.length} bytes to frontend`)
                controller.enqueue(encoded)
              }
            }
          } else {
            console.log("[roo] received empty chunk")
          }
        } catch (streamError) {
          console.error("[roo] stream processing error:", streamError)
          controller.error(streamError)
        }
      },
      cancel() {
        reader.cancel().catch(() => {})
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err) {
    console.error("[roo] sidecar fetch error:", err)
    console.error("[roo] error details:", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      url: `${sidecarBase}/roo/task`
    })
    return new Response(JSON.stringify({ error: "Sidecar unreachable" }), { status: 502 })
  }
}


