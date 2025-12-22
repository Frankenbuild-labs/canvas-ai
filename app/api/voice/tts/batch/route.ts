import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { writeFile } from "fs/promises"
import { randomUUID } from "crypto"
import { getDiaProvider } from "@lib/tts/providers/dia"

export const runtime = 'nodejs'

// Provider abstraction (Dia primary)
const AUDIO_OUTPUT_DIR = process.env.AUDIO_OUTPUT_DIR || "./uploads/voice-audio"

// Database connection helper
async function getDbClient() {
  const { Client } = await import('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  return client
}

export async function POST(request: NextRequest) {
  const db = await getDbClient()
  
  try {
    const body = await request.json()
    
    // Validate paragraphs array
    if (!body.paragraphs || !Array.isArray(body.paragraphs) || body.paragraphs.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid paragraphs array" },
        { status: 400 }
      )
    }

    if (body.paragraphs.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 paragraphs allowed per batch" },
        { status: 400 }
      )
    }

    // Validate each paragraph
    for (const para of body.paragraphs) {
      if (!para.text || !para.voice_id) {
        return NextResponse.json(
          { error: "Each paragraph must have text and voice_id" },
          { status: 400 }
        )
      }
    }

    // Get user ID from session (placeholder - replace with actual auth)
    const userId = request.headers.get("x-user-id") || "anonymous"

    // Calculate total characters
  const requestedCharacters = body.paragraphs.reduce((sum: number, p: any) => sum + p.text.length, 0)

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
    if (!isBYOK && charactersUsed + requestedCharacters > FREE_TIER_LIMIT) {
      return NextResponse.json(
        {
          error: "Free tier limit exceeded",
          detail: `This batch requires ${requestedCharacters} characters. You have ${Math.max(0, FREE_TIER_LIMIT - charactersUsed)} remaining.`,
          remaining: Math.max(0, FREE_TIER_LIMIT - charactersUsed),
        },
        { status: 429 }
      )
    }

    // Ensure required tables exist (defensive)
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

    // Optional: Associate with project
    const projectId = body.project_id || null

    // Process each paragraph sequentially via Dia TTS and persist audio
    const fs = require("fs")
    const outputDir = path.join(process.cwd(), AUDIO_OUTPUT_DIR)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const savedItems: any[] = []
  let totalCharacters = 0
    let totalDurationSeconds = 0

    for (let i = 0; i < body.paragraphs.length; i++) {
      const paragraph = body.paragraphs[i]

      // Resolve voice name (simplified while Dia cloning pipeline pending)
      let resolvedVoiceName: string = paragraph.voice_name || paragraph.voice_id || "Unknown"

      const outFormat = (paragraph.output_format === "wav" || paragraph.output_format === "opus") ? paragraph.output_format : "wav"
      const provider = getDiaProvider()
      let gen
      try {
        gen = await provider.generate({
          text: paragraph.text,
          voice: paragraph.voice_id,
          format: outFormat,
          speed: paragraph.speed,
          seed: paragraph.seed,
          temperature: paragraph.temperature,
        })
      } catch (e: any) {
        savedItems.push({ index: i, status: "failed", error: "GENERATION_FAILED", detail: e.message || String(e) })
        continue
      }
      const audioBuffer = gen.audio

      const fileId = randomUUID()
      const fileExt = gen.format
      const outFile = `${fileId}.${fileExt}`
      const outPath = path.join(outputDir, outFile)
      await writeFile(outPath, audioBuffer)

      const estimatedDuration = gen.durationSeconds
      const characterCount = gen.characterCount
      totalCharacters += characterCount
      totalDurationSeconds += estimatedDuration

      const audioUrl = `/uploads/voice-audio/${outFile}`

      const insertResult = await db.query(
        `INSERT INTO tts_generations 
         (user_id, text_content, voice_id, voice_name, audio_url, audio_duration_seconds, 
          settings, character_count, project_id, paragraph_index, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, created_at`,
        [
          userId,
          paragraph.text,
          paragraph.voice_id,
          resolvedVoiceName,
          audioUrl,
          estimatedDuration,
          JSON.stringify({
            language: paragraph.language,
            speed: paragraph.speed,
            quality: paragraph.quality,
            temperature: paragraph.temperature,
            emotion: paragraph.emotion,
            engine: "dia-tts",
          }),
          characterCount,
          projectId,
          i,
          "ready",
        ]
      )

      savedItems.push({
        index: i,
        status: "ready",
        audio_url: audioUrl,
        duration_seconds: estimatedDuration,
        character_count: characterCount,
        db_id: insertResult.rows[0].id,
        created_at: insertResult.rows[0].created_at,
      })
    }

    // Save each generation to database
    // Update usage tracking using our computed totals
    await db.query(
      `INSERT INTO voice_usage_tracking (user_id, month_year, characters_used, generations_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, month_year)
       DO UPDATE SET
         characters_used = voice_usage_tracking.characters_used + $3,
         generations_count = voice_usage_tracking.generations_count + $4,
         updated_at = NOW()`,
      [userId, currentMonth, totalCharacters, savedItems.filter(i => i.status === "ready").length]
    )

    return NextResponse.json({
      items: savedItems,
      total_characters: totalCharacters,
      total_duration_seconds: totalDurationSeconds,
      project_id: projectId,
      usage: {
        characters_used: charactersUsed + totalCharacters,
        limit: FREE_TIER_LIMIT,
        remaining: Math.max(0, FREE_TIER_LIMIT - (charactersUsed + totalCharacters)),
      },
    })
  } catch (error) {
    console.error("Batch TTS generation error:", error)
    return NextResponse.json(
      { error: "Internal server error", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  } finally {
    await db.end()
  }
}
