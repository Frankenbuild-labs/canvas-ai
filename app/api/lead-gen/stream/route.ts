import { NextRequest } from "next/server"
import { LeadStore } from "../../../../lib/leadgen/store"
import { getPrisma } from "../../../../lib/prisma"

// Ensure Node.js runtime (SSE can disconnect on edge runtime)
export const runtime = "nodejs"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  if (!sessionId) return new Response("Missing sessionId", { status: 400 })

  const encoder = new TextEncoder()
  let lastLeadCount = 0
  let interval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      // Keep-alive ping to prevent proxies from closing idle SSE
      const ping = () => {
        controller.enqueue(encoder.encode(`: ping\n\n`))
      }
      let waitingTicks = 0
      interval = setInterval(async () => {
        const session = LeadStore.getSession(sessionId)
        if (!session) {
          // Session not in memory yet - wait for it
          waitingTicks++
          send("status", { status: "waiting", message: "Waiting for session to start..." })
          if (waitingTicks % 5 === 0) {
            console.log(`[lead-gen:stream] Waiting for session ${sessionId} (tick ${waitingTicks})`)
          }
          ping()
          
          // Timeout after 30 seconds
          if (waitingTicks > 30) {
            send("status", { status: "error", message: "Session not found after 30s" })
            console.error(`[lead-gen:stream] Session ${sessionId} never appeared`)
            if (interval) clearInterval(interval)
            controller.close()
          }
          return
        }
        if (waitingTicks) {
          console.log(`[lead-gen:stream] Session appeared after ${waitingTicks} ticks: ${sessionId}`)
        }
        const currentCount = session.leads.length
        if (currentCount > lastLeadCount) {
          const newLeads = session.leads.slice(lastLeadCount)
            .map(l => ({ id: l.id, name: l.name, title: l.title, company: l.company, email: l.email ?? null, phone: l.phone ?? null, location: l.location ?? null, sourcePlatform: l.sourcePlatform, sourceUrl: l.sourceUrl, confidenceScore: l.confidenceScore, tags: l.tags }))
          send("leads", newLeads)
          console.log(`[lead-gen:stream] Emitted ${newLeads.length} new leads (total ${currentCount}) for ${sessionId}`)
          lastLeadCount = currentCount
        }
        // Periodic ping
        ping()
        if (["completed", "error"].includes(session.status)) {
          send("status", { status: session.status })
          console.log(`[lead-gen:stream] Session finished with status=${session.status} for ${sessionId}`)
          if (interval) clearInterval(interval)
          controller.close()
        }
      }, 1000)
    },
    cancel() {
      if (interval) {
        clearInterval(interval)
        interval = null
        console.log(`[lead-gen:stream] Stream cancelled for ${sessionId}`)
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      // Disable buffering on certain proxies (nginx/Cloudflare) to keep SSE flowing
      "X-Accel-Buffering": "no"
    }
  })
}
