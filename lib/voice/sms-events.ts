// Very small in-memory EventSource hub for SMS updates
// NOTE: This resets on server restart and is per-instance. Good enough for dev.

type Client = {
  id: number
  write: (chunk: string) => void
}

let clients: Client[] = []
let nextId = 1

export function addClient(write: (chunk: string) => void) {
  const client: Client = { id: nextId++, write }
  clients.push(client)
  return () => {
    clients = clients.filter(c => c.id !== client.id)
  }
}

export function broadcastSMS(event: { from: string; to: string; body: string; direction?: 'inbound' | 'outbound'; raw?: any }) {
  const payload = JSON.stringify({ type: 'sms', ...event, ts: Date.now() })
  const data = `data: ${payload}\n\n`
  for (const c of clients) {
    try { c.write(data) } catch {}
  }
}
