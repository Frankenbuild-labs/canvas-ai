import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function getDbClient() {
  const { Client } = await import('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  return client
}

export async function DELETE(request: NextRequest, { params }: { params: { voiceId: string } }) {
  const userId = request.headers.get("x-user-id") || "anonymous"
  const voiceId = params.voiceId
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }
  try {
    const db = await getDbClient()
    try {
      const result = await db.query(
        `DELETE FROM voice_clones WHERE user_id = $1 AND playht_voice_id = $2 RETURNING id`,
        [userId, voiceId]
      )
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Voice not found" }, { status: 404 })
      }
      return NextResponse.json({ deleted: true, voice_id: voiceId })
    } finally {
      await db.end()
    }
  } catch (e) {
    return NextResponse.json({ error: "Delete failed", detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { voiceId: string } }) {
  const userId = request.headers.get("x-user-id") || "anonymous"
  const voiceId = params.voiceId
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  const newName: string | undefined = body?.name
  if (!newName || newName.trim().length < 2) {
    return NextResponse.json({ error: "Name too short" }, { status: 400 })
  }
  try {
    const db = await getDbClient()
    try {
      const result = await db.query(
        `UPDATE voice_clones SET name = $1, updated_at = NOW() WHERE user_id = $2 AND playht_voice_id = $3 RETURNING id, name`,
        [newName.trim(), userId, voiceId]
      )
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Voice not found" }, { status: 404 })
      }
      return NextResponse.json({ updated: true, voice_id: voiceId, name: newName.trim() })
    } finally { await db.end() }
  } catch (e) {
    return NextResponse.json({ error: "Rename failed", detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
