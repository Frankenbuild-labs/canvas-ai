import { NextRequest } from "next/server"
import { LeadStore } from "../../../../lib/leadgen/store"
import { leadExtractionQueue } from "../../../../lib/leadgen/queue"
import { hasFeature } from "../../../../lib/feature-flags"
import { createSessionPersistent } from "../../../../lib/leadgen/adapter"

// Match stream route runtime so in-memory LeadStore is shared
export const runtime = "nodejs"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Basic validation – extend with zod later. Normalize field names.
    const params = {
      keywords: body.keywords || body.keyword || "",
      targetRole: body.targetRole || "",
      platform: body.platform || "generic",
      industry: body.industry || "General",
      location: body.location || "",
      depth: body.depth || "Standard",
      includeEmail: !!body.includeEmail,
      includePhone: !!body.includePhone,
      includeAddress: !!body.includeAddress,
      profileUrls: Array.isArray(body.profileUrls) ? body.profileUrls : undefined
    }

    // Gate advanced depth via feature flag.
    if (params.depth !== "Standard" && !hasFeature('leadgen:advanced')) {
      params.depth = "Standard"
    }
    
    // FOR NOW: Skip database persistence, use in-memory only
    // TODO: Re-enable database once connection is fixed
    // const persistentSession = await createSessionPersistent(params, null)
    // const sessionId = (persistentSession as any).id
    
    // Create in-memory session directly
    const memSession = LeadStore.createSession(params, null)
    const sessionId = memSession.id
    console.log(`[lead-gen:start] Created in-memory session ${sessionId}`)
    console.log(`[lead-gen:start] Session params:`, JSON.stringify(params))
    console.log(`[lead-gen:start] LeadStore now has sessions:`, LeadStore.getSession(sessionId) ? 'YES' : 'NO')
    
    await leadExtractionQueue.enqueue(sessionId)
    console.log(`[lead-gen:start] Enqueued extraction job ${sessionId}`)
    return new Response(JSON.stringify({ sessionId }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "start failed" }), { status: 400 })
  }
}
