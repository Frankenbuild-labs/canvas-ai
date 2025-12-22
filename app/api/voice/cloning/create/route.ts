import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { Client } from "pg"
import path from "path"
import { nanoid } from "nanoid"
import { randomUUID } from "crypto"
// Dia cloning: save audio + transcript for Dia TTS reference_audio directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads/voice-samples"
const DIA_TTS_URL = process.env.DIA_TTS_URL || "http://localhost:8003"

// Database connection helper
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

// Get audio duration (simplified - in production use ffprobe or similar)
function estimateAudioDuration(fileSize: number, format: string): number {
  // Rough estimate: MP3 at 128kbps ~ 16KB/second
  // WAV at CD quality ~ 176KB/second
  const bytesPerSecond = format.includes("wav") ? 176000 : 16000
  return fileSize / bytesPerSecond
}

export async function POST(request: NextRequest) {
  const db = await getDbClient()
  
  try {
    const formData = await request.formData()
    
    const audioFile = formData.get("audio_file") as File
    const voiceName = formData.get("voice_name") as string
    const transcript = formData.get("transcript") as string | null
    
    // Validation
    if (!audioFile) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 })
    }
    
    if (!voiceName || voiceName.trim().length === 0) {
      return NextResponse.json({ error: "Voice name is required" }, { status: 400 })
    }
    
    if (voiceName.length > 100) {
      return NextResponse.json({ error: "Voice name too long (max 100 characters)" }, { status: 400 })
    }
    
    // Validate file type
    if (!audioFile.type.startsWith("audio/")) {
      return NextResponse.json({ error: "File must be an audio format" }, { status: 400 })
    }
    
    // Validate file size (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 })
    }
    
    // Estimate duration and validate (30 seconds recommended, allow 5-120 seconds)
    const estimatedDuration = estimateAudioDuration(audioFile.size, audioFile.type)
    if (estimatedDuration < 5) {
      return NextResponse.json(
        { error: "Audio sample too short (minimum 5 seconds recommended)" },
        { status: 400 }
      )
    }
    
    if (estimatedDuration > 120) {
      return NextResponse.json(
        { error: "Audio sample too long (maximum 2 minutes)" },
        { status: 400 }
      )
    }
    
    // Get user ID
    const userId = request.headers.get("x-user-id") || "anonymous"
    
    // Check clone limit for free tier (e.g., 5 clones max)
    const cloneCountResult = await db.query(
      `SELECT COUNT(*) as count FROM voice_clones WHERE user_id = $1`,
      [userId]
    )
    const cloneCount = parseInt(cloneCountResult.rows[0].count)
    
    const MAX_CLONES = 10 // Free tier limit
    if (cloneCount >= MAX_CLONES) {
      return NextResponse.json(
        {
          error: "Clone limit reached",
          detail: `You have reached the maximum of ${MAX_CLONES} cloned voices. Please delete some before creating new ones.`,
        },
        { status: 429 }
      )
    }
    
    // Save file locally first
    const fileId = nanoid(10)
    const fileExtension = audioFile.name.split(".").pop() || "wav"
    const fileName = `${fileId}.${fileExtension}`
    const filePath = path.join(process.cwd(), UPLOAD_DIR, fileName)
    
    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Ensure directory exists
    const fs = require("fs")
    const uploadDir = path.join(process.cwd(), UPLOAD_DIR)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    await writeFile(filePath, buffer)
    
    // Also save transcript if provided (Dia TTS uses .txt files alongside audio)
    if (transcript && transcript.trim().length > 0) {
      const transcriptFileName = `${fileId}.txt`
      const transcriptPath = path.join(process.cwd(), UPLOAD_DIR, transcriptFileName)
      // Format transcript for Dia: [S1] transcript_text
      const formattedTranscript = transcript.startsWith('[S') ? transcript : `[S1] ${transcript}`
      await writeFile(transcriptPath, formattedTranscript, 'utf-8')
      console.log(`Saved transcript: ${transcriptFileName}`)
    }
    
    console.log(`Saved audio sample: ${fileName} (${(audioFile.size / 1024).toFixed(2)} KB)`)
    
    // Create initial database record with 'processing' status
    const insertResult = await db.query(
      `INSERT INTO voice_clones 
       (user_id, name, sample_audio_url, audio_duration_seconds, transcript, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        userId,
        voiceName,
        `/uploads/voice-samples/${fileName}`,
        estimatedDuration,
        transcript || null,
        "processing",
      ]
    )
    
    const cloneId = insertResult.rows[0].id
    
    // Dia TTS cloning: use the filename as the voice reference
    // Dia will look for fileName (audio) + fileName.txt (transcript) in reference_audio directory
    const diaVoiceReference = fileName
    await db.query(
      `UPDATE voice_clones 
       SET playht_voice_id = $1, voice_manifest_url = $2, status = 'ready', updated_at = NOW()
       WHERE id = $3`,
      [diaVoiceReference, null, cloneId]
    )

    const currentMonth = new Date().toISOString().slice(0, 7)
    await db.query(
      `INSERT INTO voice_usage_tracking (user_id, month_year, clones_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, month_year)
       DO UPDATE SET
         clones_count = voice_usage_tracking.clones_count + 1,
         updated_at = NOW()`,
      [userId, currentMonth]
    )

    console.log(`Voice clone registered for Dia TTS: ${voiceName} -> ${diaVoiceReference}`)

    return NextResponse.json({
      id: cloneId,
      playht_voice_id: diaVoiceReference,
      name: voiceName,
      sample_audio_url: `/uploads/voice-samples/${fileName}`,
      status: "ready",
      estimated_duration: estimatedDuration,
      transcript: transcript || null,
      dia_voice_reference: diaVoiceReference,
    })
  } catch (error) {
    console.error("Voice cloning error:", error)
    return NextResponse.json(
      { error: "Internal server error", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  } finally {
    await db.end()
  }
}
