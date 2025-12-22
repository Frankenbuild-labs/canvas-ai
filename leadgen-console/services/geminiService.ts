import { SearchParams, Lead } from "../types";

// Legacy direct generation (still available fallback)
export const generateLeads = async (params: SearchParams): Promise<Lead[]> => {
  const res = await fetch('/api/lead-gen/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  if (!res.ok) throw new Error('Failed to generate leads')
  const data = await res.json()
  return data.leads as Lead[]
}

export async function startLeadExtraction(params: SearchParams): Promise<string> {
  const payload = {
    keywords: params.keywords,
    targetRole: params.targetRole,
    platform: params.platform,
    industry: params.industry,
    location: params.location,
    depth: params.depth,
    includeEmail: params.includeEmail,
    includePhone: params.includePhone,
    includeAddress: !!params.includeAddress
  }
  const res = await fetch('/api/lead-gen/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to start extraction')
  const data = await res.json()
  return data.sessionId as string
}

export function subscribeToLeadStream(sessionId: string, handlers: {
  onLeads: (leads: Lead[]) => void
  onStatus: (status: string) => void
  onError: (message: string) => void
}): () => void {
  const es = new EventSource(`/api/lead-gen/stream?sessionId=${encodeURIComponent(sessionId)}`)
  es.addEventListener('leads', (evt) => {
    try {
      const raw = JSON.parse((evt as MessageEvent).data)
      const mapped: Lead[] = raw.map((r: any) => ({
        id: r.id || crypto.randomUUID(),
        name: r.name,
        title: r.title,
        company: r.company,
        email: r.email ?? null,
        phone: r.phone ?? null,
        address: r.address ?? r.location ?? null,
        location: r.location || '',
        source: r.sourcePlatform || 'General Web',
        confidenceScore: r.confidenceScore || 0,
        tags: r.tags || [],
        status: 'New'
      }))
      handlers.onLeads(mapped)
    } catch (e) {
      handlers.onError('Failed to parse leads event')
    }
  })
  es.addEventListener('status', (evt) => {
    try {
      const data = JSON.parse((evt as MessageEvent).data)
      handlers.onStatus(data.status)
      if (data.status === 'completed' || data.status === 'error') {
        es.close()
      }
    } catch (e) {
      handlers.onError('Failed to parse status event')
    }
  })
  es.addEventListener('error', (evt) => {
    handlers.onError('Stream error or disconnected')
  })
  return () => es.close()
}

export interface LeadgenFeatures {
  advanced: boolean
  brightdata: boolean
}

export async function fetchLeadgenFeatures(): Promise<LeadgenFeatures> {
  const res = await fetch('/api/lead-gen/features', { method: 'GET' })
  if (!res.ok) throw new Error('Failed to fetch features')
  return res.json()
}