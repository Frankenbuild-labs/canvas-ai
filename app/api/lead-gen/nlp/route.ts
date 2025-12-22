import { NextRequest } from 'next/server'
import { hasFeature } from '../../../../lib/feature-flags'
import { LeadStore } from '../../../../lib/leadgen/store'
import { createSessionPersistent } from '../../../../lib/leadgen/adapter'
import { leadExtractionQueue } from '../../../../lib/leadgen/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function extractFilters(query: string, openaiKey?: string) {
  const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  if (!openaiKey) {
    // Fallback heuristic
    return {
      role: /manager|director|engineer|developer|founder|cto|cmo/i.exec(query)?.[0] || 'professional',
      industry: /fintech|saas|healthcare|marketing|ai|cloud/i.exec(query)?.[0] || 'technology',
      location: /new york|paris|london|kenya|san francisco|india|toronto/i.exec(query)?.[0] || 'Worldwide',
      keywords: query
    }
  }
  const prompt = `Extract structured lead search filters from the query. Return ONLY valid JSON with keys: role, industry, location, keywords. Query: "${query}"`
  try {
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Extract concise filters. Always return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0
      })
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    const content: string = json.choices?.[0]?.message?.content || '{}'
    const cleaned = content.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch (e) {
    return {
      role: 'professional',
      industry: 'technology',
      location: 'Worldwide',
      keywords: query
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const query: string = body.query || ''
    if (!query.trim()) return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 })
    const filters = await extractFilters(query, process.env.OPENAI_API_KEY)
    // Normalize into session params
    const params = {
      keywords: filters.keywords || filters.role || query,
      targetRole: filters.role || 'professional',
      platform: 'LinkedIn',
      industry: filters.industry || 'General',
      location: filters.location || 'Worldwide',
      depth: 'Standard',
      includeEmail: !!body.includeEmail,
      includePhone: !!body.includePhone,
      includeAddress: !!body.includeAddress
    }
    if (params.depth !== 'Standard' && !hasFeature('leadgen:advanced')) params.depth = 'Standard'
    const persistent = await createSessionPersistent(params, null)
    const sessionId = (persistent as any).id
    // Mirror to memory
    let mem = LeadStore.getSession(sessionId)
    if (!mem) LeadStore.createSessionWithId(sessionId, params, null)
    await leadExtractionQueue.enqueue(sessionId)
    return new Response(JSON.stringify({ sessionId, filters: params }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'nlp failed' }), { status: 400 })
  }
}
