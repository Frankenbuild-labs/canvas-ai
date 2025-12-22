export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"

// Database connection helper
async function getDbClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })
  await client.connect()
  return client
}

export async function GET(request: NextRequest) {
  const db = await getDbClient()
  
  try {
    const userId = request.headers.get("x-user-id") || "anonymous"
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // Filter by status: processing, ready, failed
    
    let query = `
      SELECT 
        id,
        name,
        playht_voice_id,
        voice_manifest_url,
        sample_audio_url,
        audio_duration_seconds,
        transcript,
        status,
        error_message,
        created_at,
        updated_at
      FROM voice_clones
      WHERE user_id = $1
    `
    
    const params: any[] = [userId]
    
    if (status) {
      query += ` AND status = $2`
      params.push(status)
    }
    
    query += ` ORDER BY created_at DESC`
    
    const result = await db.query(query, params)
    
    return NextResponse.json({
      clones: result.rows,
      total: result.rows.length,
    })
  } catch (error) {
    console.error("List cloned voices error:", error)
    return NextResponse.json(
      { error: "Internal server error", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  } finally {
    await db.end()
  }
}
