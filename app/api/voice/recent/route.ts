export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from "next/server"
import { Client } from "pg"

async function getDbClient() {
  const connStr = process.env.DATABASE_URL || ''
  const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1')
  const client = new Client({
    connectionString: connStr,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  })
  await client.connect()
  return client
}

export async function GET(request: NextRequest) {
  const db = await getDbClient()
  try {
    const userId = request.headers.get("x-user-id") || "anonymous"
    const limit = Number(new URL(request.url).searchParams.get("limit") || 20)

    // Use tts_generations to compute recent voices
    const result = await db.query(
      `SELECT voice_id, MAX(created_at) as last_used_at, MAX(voice_name) as voice_name
       FROM tts_generations
       WHERE user_id = $1 AND status = 'ready' AND voice_id IS NOT NULL
       GROUP BY voice_id
       ORDER BY last_used_at DESC
       LIMIT $2`,
      [userId, limit]
    )

    return NextResponse.json({ recent: result.rows })
  } catch (err) {
    console.error("Recent voices GET error:", err)
    return NextResponse.json({ error: "Failed to fetch recent voices" }, { status: 500 })
  } finally {
    await db.end()
  }
}
