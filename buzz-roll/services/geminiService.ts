import { GeneratedScript } from "../types"

// Resolve API base for both Next (same-origin) and Vite dev (proxy to Next)
// Prefer window.__API_BASE__; fallback to '' (same-origin)
const API_BASE: string = (() => {
  try {
    if (typeof window !== 'undefined' && (window as any).__API_BASE__) {
      return (window as any).__API_BASE__ as string
    }
    return ''
  } catch {
    return ''
  }
})()

// Client-side thin wrapper calling internal API routes (no direct Gemini usage)
export const generateVideoScript = async (topic: string, style: string): Promise<GeneratedScript | null> => {
  const res = await fetch(`${API_BASE}/api/b-roll/script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, style })
  })
  if (!res.ok) {
    let detail: string | undefined
    try { const j = await res.json(); detail = j?.error } catch {}
    throw new Error(detail || 'Failed to generate script')
  }
  const data = await res.json()
  return data.script as GeneratedScript | null
}

export const generateCaptionForScene = async (prompt: string): Promise<string | null> => {
  const res = await fetch(`${API_BASE}/api/b-roll/caption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  })
  if (!res.ok) {
    let detail: string | undefined
    try { const j = await res.json(); detail = j?.error } catch {}
    throw new Error(detail || 'Failed to generate caption')
  }
  const data = await res.json()
  return data.caption as string | null
}

export const generateTTS = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
  const res = await fetch(`${API_BASE}/api/b-roll/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName })
  })
  if (!res.ok) {
    let detail: string | undefined
    try { const j = await res.json(); detail = j?.error } catch {}
    throw new Error(detail || 'Failed to generate TTS')
  }
  const data = await res.json()
  const base64 = data.audioBase64 as string
  if (!base64) return null
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: 'audio/wav' })
  return URL.createObjectURL(blob)
}