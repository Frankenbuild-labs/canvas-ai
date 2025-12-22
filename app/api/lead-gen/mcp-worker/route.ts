import { NextRequest } from "next/server"
import { getBrightDataMCP } from "../../../../lib/mcp/brightdata-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { keyword, location, country, limit } = await req.json()
    
    console.log('[mcp-worker] Connecting to BrightData MCP...')
    const bdMCP = getBrightDataMCP()
    await bdMCP.connect()
    
    console.log('[mcp-worker] Searching with:', { keyword, location, country, limit })
    const results = await bdMCP.searchLinkedInJobs({
      keyword,
      location: location || '',
      country: country || 'US',
      limit: limit || 25
    })
    
    console.log('[mcp-worker] Got', results.length, 'results')
    if (results.length > 0) {
      console.log('[mcp-worker] FIRST RESULT:', JSON.stringify(results[0], null, 2))
    }
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error: any) {
    console.error('[mcp-worker] Error:', error.message, error.stack)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
