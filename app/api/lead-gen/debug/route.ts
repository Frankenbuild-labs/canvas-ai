import { NextRequest } from "next/server"
import { LeadStore } from "../../../../lib/leadgen/store"
import { providerRegistry } from "../../../../lib/leadgen/providers"
import { hasFeature } from "../../../../lib/feature-flags"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  
  const debug = {
    timestamp: new Date().toISOString(),
    sessionId: sessionId || 'none',
    sessionExists: sessionId ? !!LeadStore.getSession(sessionId) : null,
    sessionDetails: sessionId ? LeadStore.getSession(sessionId) : null,
    featureFlags: {
      mock: hasFeature('leadgen:mock'),
      brightdata: hasFeature('leadgen:brightdata'),
      advanced: hasFeature('leadgen:advanced')
    },
    providers: {
      total: providerRegistry.length,
      list: providerRegistry.map(p => p.id)
    },
    env: {
      BRIGHTDATA_API_TOKEN: process.env.BRIGHTDATA_API_TOKEN ? 'SET' : 'NOT SET',
      REDIS_URL: process.env.REDIS_URL ? 'SET' : 'NOT SET'
    }
  }
  
  return new Response(JSON.stringify(debug, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  })
}
