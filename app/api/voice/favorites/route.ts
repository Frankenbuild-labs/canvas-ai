import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/database"

function requireUserId(request: NextRequest): string | null {
  const uid = request.headers.get("x-user-id")
  return uid && uid.trim().length > 0 ? uid : null
}

export async function GET(request: NextRequest) {
  try {
    const userId = requireUserId(request)
    if (!userId) return NextResponse.json({ error: "Missing x-user-id" }, { status: 401 })
    const rows = await sql(
      `SELECT voice_id, voice_name, created_at FROM voice_favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )
    return NextResponse.json({ favorites: rows })
  } catch (err) {
    console.error("Favorites GET error:", err)
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = requireUserId(request)
    if (!userId) return NextResponse.json({ error: "Missing x-user-id" }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const voiceId = body.voice_id as string | undefined
    const voiceName = (body.voice_name as string | undefined) || null
    if (!voiceId) {
      return NextResponse.json({ error: "voice_id required" }, { status: 400 })
    }
    await sql(
      `INSERT INTO voice_favorites (user_id, voice_id, voice_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, voice_id) DO UPDATE SET voice_name = EXCLUDED.voice_name, created_at = NOW()`,
      [userId, voiceId, voiceName]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Favorites POST error:", err)
    return NextResponse.json({ error: "Failed to save favorite" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = requireUserId(request)
    if (!userId) return NextResponse.json({ error: "Missing x-user-id" }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const voiceId = body.voice_id as string | undefined
    if (!voiceId) {
      return NextResponse.json({ error: "voice_id required" }, { status: 400 })
    }
    await sql(`DELETE FROM voice_favorites WHERE user_id = $1 AND voice_id = $2`, [userId, voiceId])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Favorites DELETE error:", err)
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 })
  }
}
