import { NextRequest, NextResponse } from "next/server"

// This route examines request.url/search params; force dynamic to avoid build-time prerender
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Database connection helper
async function getDbClient() {
  const { Client } = await import('pg')
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
  try {
    const { searchParams } = new URL(request.url)
    // Filters and options
  const language = searchParams.get("language") || undefined
  const gender = searchParams.get("gender") || undefined
  const style = searchParams.get("style") || undefined
  const accent = searchParams.get("accent") || undefined
    const emotionsOnly = searchParams.get("emotions_only") === "true"
    const includeCloned = searchParams.get("include_cloned") !== "false" // Default true
    const q = searchParams.get("q")?.toLowerCase() || ""
    const userId = request.headers.get("x-user-id") || "anonymous"
    // Build pre-made voices list from static catalog (production-safe, no external dependencies)
  // Load premade voices from database references table; fall back to minimal placeholders if empty
  let premadeVoices: any[] = []
  if (process.env.DATABASE_URL) {
    try {
      const db = await getDbClient()
      try {
        // Check if table exists first
        const tableCheck = await db.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'voice_premade_refs')`)
        if (tableCheck.rows[0].exists) {
          const res = await db.query(`SELECT voice_id, name, sample_url, reference_id FROM voice_premade_refs ORDER BY created_at DESC LIMIT 200`)
          premadeVoices = res.rows.map(r => ({
            id: r.voice_id,
            name: r.name,
            gender: null,
            accent: null,
            language: "English",
            languageCode: "en",
            hasEmotions: false,
            isCloned: false,
            sampleUrl: r.sample_url,
            _meta: { reference_id: r.reference_id }
          }))
        }
      } finally {
        await db.end()
      }
    } catch (e) {
      console.warn("voices: failed loading premade refs", e instanceof Error ? e.message : e)
    }
  }
  if (premadeVoices.length === 0) {
    premadeVoices = [
      { id: "voice_basic_female", name: "Basic Female", gender: "Female", accent: "Neutral", language: "English", languageCode: "en", hasEmotions: false, isCloned: false, sampleUrl: null, _meta: {} },
      { id: "voice_basic_male", name: "Basic Male", gender: "Male", accent: "Neutral", language: "English", languageCode: "en", hasEmotions: false, isCloned: false, sampleUrl: null, _meta: {} }
    ]
  }

    // Fetch user's cloned voices from database (best-effort only)
    let clonedVoices: any[] = []
    if (includeCloned && process.env.DATABASE_URL) {
      try {
        const db = await getDbClient()
        try {
          const clonedResult = await db.query(
            `SELECT 
               id,
               name,
               playht_voice_id as voice_id,
               sample_audio_url,
               status,
               created_at
             FROM voice_clones
             WHERE user_id = $1 AND status = 'ready'
             ORDER BY created_at DESC`,
            [userId]
          )

          clonedVoices = clonedResult.rows.map((row) => ({
            id: row.voice_id,
            name: row.name,
            gender: "N/A",
            accent: "Custom",
            language: "N/A",
            languageCode: null,
            hasEmotions: false,
            isCloned: true,
            sampleUrl: row.sample_audio_url,
            clonedVoiceDbId: row.id,
            createdAt: row.created_at,
          }))
        } finally {
          await db.end()
        }
      } catch (e) {
        console.warn("voices: DB unavailable, returning premade only", e instanceof Error ? e.message : e)
      }
    }

    // Apply additional filters/search on cached list
    const filterFn = (v: any) => {
      const matchesQuery = q
        ? [v.name, v.accent, v.language, v._meta?.style].filter(Boolean).some((t) => String(t).toLowerCase().includes(q))
        : true
      const matchesLanguage = language ? String(v.language || '').toLowerCase() === language.toLowerCase() : true
      const matchesGender = gender ? String(v.gender || '').toLowerCase() === gender.toLowerCase() : true
      const matchesAccent = accent ? String(v.accent || '').toLowerCase() === accent.toLowerCase() : true
      const voiceStyle: string | null = (v as any)._meta?.style || (v as any).style || null
      const matchesStyle = style ? String(voiceStyle || '').toLowerCase() === style.toLowerCase() : true
      const matchesEmotions = emotionsOnly ? Boolean(v.hasEmotions) : true
      return matchesQuery && matchesLanguage && matchesGender && matchesAccent && matchesStyle && matchesEmotions
    }

    const filteredPremade = premadeVoices.filter(filterFn)
    const filteredCloned = includeCloned ? clonedVoices.filter(filterFn) : []

    const combined = [...filteredPremade, ...filteredCloned]
    const total = combined.length
  // Return full combined list (caller requested entire catalog behavior)
  const paged = combined

    return NextResponse.json({
      voices: paged,
      total,
      premade_count: filteredPremade.length,
      cloned_count: filteredCloned.length,
      cached: true,
      pagination: {
        limit: combined.length,
        offset: 0,
        hasMore: false,
      },
      env: {
        localService: false,
        hasApiKey: false,
      },
    })
  } catch (error) {
    console.error("Voices list error:", error)
    return NextResponse.json(
      { error: "Internal server error", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

