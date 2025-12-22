import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/database"

type AgentSettings = {
  prefab?: "receptionist" | "info-gatherer" | "faq-bot"
  name?: string
  persona?: string
  language?: string
  temperature?: number
  voice?: string
  recordCalls?: boolean
  transcripts?: boolean
}

async function fetchAgentSettings(agentId: string): Promise<AgentSettings | null> {
  const rows = await sql`
    select settings from signalwire_agents where id = ${agentId}
  `
  if (!rows?.length) return null
  return rows[0]?.settings as AgentSettings
}

// Placeholder Agent Answer route
// In production, start a SignalWire Agent session here and stream audio.
// For now, return LaML-compatible XML that greets the caller.
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const agentId = url.searchParams.get("agentId") || ""
    const settings = agentId ? await fetchAgentSettings(agentId) : null

    const serviceBase = process.env.AGENTS_SERVICE_URL || 'http://127.0.0.1:8100'
    const qs = new URLSearchParams({
      prefab: settings?.prefab || '',
      name: settings?.name || 'CanvasAI Agent',
      persona: settings?.persona || '',
      language: settings?.language || 'en-US',
      temperature: String(settings?.temperature ?? 0.3),
      voice: settings?.voice || '',
      record: String(settings?.recordCalls ?? true),
      transcripts: String(settings?.transcripts ?? true),
    })
    const res = await fetch(`${serviceBase}/answer_xml?${qs.toString()}`, { method: 'POST', cache: 'no-store' })
    const xml = await res.text()
    return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } })
  } catch (e: any) {
    const xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Response>\n  <Say>We could not start the agent. Please try later.</Say>\n  <Hangup/>\n</Response>`
    return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } })
  }
}

export const GET = POST
