import { NextRequest } from 'next/server'
import { addClient } from '@/lib/voice/sms-events'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const write = (chunk: string) => controller.enqueue(encoder.encode(chunk))

      // Initial event to confirm subscription
      write(`data: ${JSON.stringify({ type: 'hello', ts: Date.now() })}\n\n`)

      // Register client
      const remove = addClient(write)

      // Heartbeat every 25s to keep connections alive on some proxies
      const hb = setInterval(() => {
        try { write(': ping\n\n') } catch {}
      }, 25000)

      // Cleanup on close
      const close = () => {
        clearInterval(hb)
        remove()
        controller.close()
      }

      // Next.js doesn't give us an explicit close hook here; rely on GC.
      // Returning a reference allows the runtime to close if needed.
      ;(controller as any)._onClose = close
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
