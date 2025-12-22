/**
 * PlayHT Client Library
 * TypeScript client for interacting with PlayHT Python service
 */

const PLAYHT_SERVICE_URL = process.env.PLAYHT_SERVICE_URL || "http://localhost:8001"

export interface TTSOptions {
  text: string
  voice_id: string
  language?: string
  speed?: number
  quality?: "draft" | "low" | "medium" | "high" | "premium"
  temperature?: number
  emotion?: string
  voice_guidance?: number
  style_guidance?: number
  text_guidance?: number
  output_format?: "mp3" | "wav" | "ogg" | "flac" | "mulaw"
}

export interface TTSResponse {
  id: string
  audio_url: string
  duration_seconds?: number
  character_count: number
  voice_id: string
  status: string
}

export interface BatchTTSRequest {
  paragraphs: TTSOptions[]
}

export interface BatchTTSResponse {
  items: TTSResponse[]
  total_characters: number
  total_duration_seconds?: number
}

export interface VoiceInfo {
  id: string
  name: string
  gender?: string
  accent?: string
  language?: string
  language_code?: string
  has_emotions: boolean
  is_cloned: boolean
  sample_url?: string
}

export interface VoiceCloningRequest {
  audio_file: File
  voice_name: string
  transcript?: string
}

export class PlayHTClient {
  private baseURL: string

  constructor(baseURL?: string) {
    this.baseURL = baseURL || PLAYHT_SERVICE_URL
  }

  /**
   * Generate TTS audio from text
   */
  async generateTTS(options: TTSOptions): Promise<TTSResponse> {
    const response = await fetch(`${this.baseURL}/tts/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: options.text,
        voice_id: options.voice_id,
        language: options.language || "english",
        speed: options.speed || 1.0,
        quality: options.quality || "medium",
        temperature: options.temperature,
        emotion: options.emotion,
        voice_guidance: options.voice_guidance || 3.0,
        style_guidance: options.style_guidance || 20.0,
        text_guidance: options.text_guidance || 2.0,
        output_format: options.output_format || "mp3",
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.detail || error.error || "TTS generation failed")
    }

    const data = await response.json()
    
    // Convert relative URL to absolute
    if (data.audio_url && data.audio_url.startsWith("/audio/")) {
      data.audio_url = `${this.baseURL}${data.audio_url}`
    }

    return data
  }

  /**
   * Generate multiple TTS audio files in batch
   */
  async generateBatchTTS(request: BatchTTSRequest): Promise<BatchTTSResponse> {
    const response = await fetch(`${this.baseURL}/tts/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.detail || error.error || "Batch TTS generation failed")
    }

    const data = await response.json()
    
    // Convert relative URLs to absolute
    data.items = data.items.map((item: TTSResponse) => ({
      ...item,
      audio_url: item.audio_url.startsWith("/audio/") 
        ? `${this.baseURL}${item.audio_url}`
        : item.audio_url
    }))

    return data
  }

  /**
   * Clone a voice from audio sample
   */
  async cloneVoice(request: VoiceCloningRequest): Promise<VoiceInfo> {
    const formData = new FormData()
    formData.append("audio_file", request.audio_file)
    formData.append("voice_name", request.voice_name)
    if (request.transcript) {
      formData.append("transcript", request.transcript)
    }

    const response = await fetch(`${this.baseURL}/cloning/create`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.detail || error.error || "Voice cloning failed")
    }

    return await response.json()
  }

  /**
   * List available PlayHT voices
   */
  async listVoices(filters?: {
    language?: string
    gender?: string
    emotions_only?: boolean
  }): Promise<VoiceInfo[]> {
    const params = new URLSearchParams()
    if (filters?.language) params.append("language", filters.language)
    if (filters?.gender) params.append("gender", filters.gender)
    if (filters?.emotions_only) params.append("emotions_only", "true")

    const url = `${this.baseURL}/voices/list${params.toString() ? `?${params.toString()}` : ""}`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.detail || error.error || "Failed to list voices")
    }

    return await response.json()
  }

  /**
   * Delete a generated audio file
   */
  async deleteAudio(filename: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/audio/${filename}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.detail || error.error || "Failed to delete audio")
    }
  }

  /**
   * Get audio file URL
   */
  getAudioURL(filename: string): string {
    return `${this.baseURL}/audio/${filename}`
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: "GET",
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Create WebSocket connection for streaming TTS
   */
  createStreamingConnection(): WebSocket {
    const wsURL = this.baseURL.replace("http://", "ws://").replace("https://", "wss://")
    return new WebSocket(`${wsURL}/tts/stream`)
  }
}

// Export singleton instance
export const playhtClient = new PlayHTClient()

// Helper functions for voice management
export async function getVoicesByLanguage(language: string): Promise<VoiceInfo[]> {
  return playhtClient.listVoices({ language })
}

export async function getEmotionVoices(): Promise<VoiceInfo[]> {
  return playhtClient.listVoices({ emotions_only: true })
}

export async function estimateTTSCost(text: string, characterCost = 0.000075): Promise<number> {
  // PlayHT pricing: ~$0.000075 per character for quality voices
  const characterCount = text.length
  return characterCount * characterCost
}

export async function checkFreeCharacterLimit(used: number, limit = 2500): Promise<{
  remaining: number
  percentage: number
  isExceeded: boolean
}> {
  const remaining = Math.max(0, limit - used)
  const percentage = (used / limit) * 100
  
  return {
    remaining,
    percentage: Math.min(100, percentage),
    isExceeded: used >= limit,
  }
}
