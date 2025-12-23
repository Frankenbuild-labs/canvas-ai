import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { writeFile } from "fs/promises"
import { randomUUID } from "crypto"
import { getPlaydiffusionProvider } from "@lib/tts/providers/playdiffusion"

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

// Use provider abstraction (Dia primary)
const AUDIO_OUTPUT_DIR = process.env.AUDIO_OUTPUT_DIR || "./uploads/voice-audio"

export async function POST(request: NextRequest) {
  const db = await getDbClient()
  
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.text || !body.voice_id) {
      return NextResponse.json(
        { error: "Missing required fields: text and voice_id" },
        { status: 400 }
      )
    }

    // Validate text length
    if (body.text.length > 50000) {
      return NextResponse.json(
        { error: "Text exceeds maximum length of 50,000 characters" },
        { status: 400 }
      )
    }

    // Get user ID from session (placeholder - replace with actual auth)
    const userId = request.headers.get("x-user-id") || "anonymous"

    // Check usage limits for non-BYOK users
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const usageResult = await db.query(
      `SELECT characters_used, is_byok 
       FROM voice_usage_tracking 
       WHERE user_id = $1 AND month_year = $2`,
      [userId, currentMonth]
    )

    let charactersUsed = 0
    let isBYOK = false

    if (usageResult.rows.length > 0) {
      charactersUsed = usageResult.rows[0].characters_used
      isBYOK = usageResult.rows[0].is_byok
    }

    // Enforce free tier limit (2,500 chars/month) for non-BYOK users
    const FREE_TIER_LIMIT = 2500
    if (!isBYOK && charactersUsed + body.text.length > FREE_TIER_LIMIT) {
      return NextResponse.json(
        {
          error: "Free tier limit exceeded",
          detail: `You have used ${charactersUsed} of ${FREE_TIER_LIMIT} free characters this month. Please upgrade or add your own API key.`,
          remaining: Math.max(0, FREE_TIER_LIMIT - charactersUsed),
        },
        { status: 429 }
      )
    }

    // Ensure required tables exist (defensive for local dev)
    await db.query(`
      CREATE TABLE IF NOT EXISTS voice_usage_tracking (
        user_id TEXT NOT NULL,
        month_year TEXT NOT NULL,
        characters_used INTEGER DEFAULT 0,
        generations_count INTEGER DEFAULT 0,
        clones_count INTEGER DEFAULT 0,
        is_byok BOOLEAN DEFAULT false,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, month_year)
      );
    `)
    await db.query(`
      CREATE TABLE IF NOT EXISTS tts_generations (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        text_content TEXT NOT NULL,
        voice_id TEXT,
        voice_name TEXT,
        audio_url TEXT,
        audio_duration_seconds REAL,
        settings JSONB,
        character_count INTEGER,
        project_id TEXT NULL,
        paragraph_index INTEGER NULL,
        status TEXT DEFAULT 'ready',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    // Resolve voice name and check if it's a cloned voice
    let resolvedVoiceName: string = body.voice_name || body.voice_id || "Unknown"
    let voiceToUse = body.voice_id
    let isClonedVoice = false
    
    // Map standard voice IDs to Dia TTS voice names
    const voiceMapping: Record<string, string> = {
      'voice_basic_male': 'S1',
      'voice_basic_female': 'S2',
      'Basic Male': 'S1',
      'Basic Female': 'S2',
    }
    
    // Check if it's a standard voice that needs mapping
    if (voiceMapping[body.voice_id]) {
      voiceToUse = voiceMapping[body.voice_id]
      console.log(`Mapped voice ${body.voice_id} -> ${voiceToUse}`)
    } else {
      // Check if voice_id matches a cloned voice (stored as filename in playht_voice_id)
      const cloneCheck = await db.query(
        `SELECT id, name, playht_voice_id FROM voice_clones WHERE playht_voice_id = $1`,
        [body.voice_id]
      )
      
      if (cloneCheck.rows.length > 0) {
        isClonedVoice = true
        resolvedVoiceName = cloneCheck.rows[0].name
        // For Dia TTS cloning, the voice parameter should be the audio filename
        voiceToUse = cloneCheck.rows[0].playht_voice_id
        console.log(`Using cloned voice: ${resolvedVoiceName} (${voiceToUse})`)
      }
    }

    const provider = getPlaydiffusionProvider()
    const outFormat = (body.output_format === "wav" || body.output_format === "opus") ? body.output_format : "wav"
    let generation
    try {
      generation = await provider.generate({
        text: body.text,
        voice: voiceToUse,
        format: outFormat,
        speed: body.speed,
        seed: body.seed,
        temperature: body.temperature,
      })
    } catch (e: any) {
      return NextResponse.json({ error: "TTS generation failed", detail: e.message || String(e) }, { status: 502 })
    }
    const audioBuffer = generation.audio

    // Ensure output dir exists
    const fs = require("fs")
    const outputDir = path.join(process.cwd(), AUDIO_OUTPUT_DIR)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Persist audio to file and return URL
    const fileId = randomUUID()
    const fileExt = generation.format
    const outFile = `${fileId}.${fileExt}`
    const outPath = path.join(outputDir, outFile)
    await writeFile(outPath, audioBuffer)

    // Estimate duration based on rough bitrate if server didn't return metadata
    const estimatedDuration = generation.durationSeconds
    const characterCount = generation.characterCount
    const audioUrl = `/uploads/voice-audio/${outFile}`

    // Save generation to database
    const insertResult = await db.query(
      `INSERT INTO tts_generations 
       (user_id, text_content, voice_id, voice_name, audio_url, audio_duration_seconds, settings, character_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [
        userId,
        body.text,
    body.voice_id,
    resolvedVoiceName,
        audioUrl,
        estimatedDuration,
        JSON.stringify({
          language: body.language,
          speed: body.speed,
          quality: body.quality,
          temperature: body.temperature,
          emotion: body.emotion,
          engine: "playdiffusion-tts",
        }),
        characterCount,
        "ready",
      ]
    )

    const generationId = insertResult.rows[0].id

    // Update usage tracking
    await db.query(
      `INSERT INTO voice_usage_tracking (user_id, month_year, characters_used, generations_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_id, month_year)
       DO UPDATE SET
         characters_used = voice_usage_tracking.characters_used + $3,
         generations_count = voice_usage_tracking.generations_count + 1,
         updated_at = NOW()`,
      [userId, currentMonth, characterCount]
    )

    return NextResponse.json({
      id: generationId,
      audio_url: audioUrl,
      duration_seconds: estimatedDuration,
      character_count: characterCount,
      voice_id: body.voice_id,
      status: "ready",
      usage: {
        characters_used: charactersUsed + characterCount,
        limit: FREE_TIER_LIMIT,
        remaining: Math.max(0, FREE_TIER_LIMIT - (charactersUsed + characterCount)),
      },
    })
  } catch (error) {
    console.error("TTS generation error:", error)
    return NextResponse.json(
      { error: "Internal server error", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  } finally {
    await db.end()
  }
}
