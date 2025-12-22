import { GoogleGenAI, Modality, Type } from "@google/genai"

// Server-side Gemini client (never import this file in client components)
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
  if (!apiKey) return null
  return new GoogleGenAI({ apiKey })
}

function hasApiKey() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY)
}

function mockScript(topic: string) {
  return {
    title: `Draft: ${topic}`,
    scenes: [
      { visual: `Hook: ${topic} in 5 seconds`, voiceover: `Let's talk about ${topic} in 30 seconds.`, estimatedDuration: 5 },
      { visual: `Problem / Tension`, voiceover: `Here's the problem most people face with ${topic}.`, estimatedDuration: 5 },
      { visual: `Solution / Steps`, voiceover: `Do these quick steps to fix it fast.`, estimatedDuration: 6 },
      { visual: `Payoff`, voiceover: `Now ${topic} becomes effortless.`, estimatedDuration: 4 }
    ]
  }
}

function synthesizeBeepWavBase64(durationSec = 1, freq = 440, sampleRate = 22050) {
  const numSamples = Math.floor(durationSec * sampleRate)
  const bytesPerSample = 2
  const dataSize = numSamples * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // WAV header
  const writeString = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)) }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true)  // audio format PCM
  view.setUint16(22, 1, true)  // channels mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  // Sine wave data
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const sample = Math.sin(2 * Math.PI * freq * t)
    const s = Math.max(-1, Math.min(1, sample))
    view.setInt16(offset, s * 0x7fff, true)
    offset += 2
  }

  // Convert to base64
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return Buffer.from(binary, 'binary').toString('base64')
}

export async function generateVideoScript(topic: string, style: string) {
  if (!hasApiKey()) return mockScript(topic)
  const ai = getClient()!
  const prompt = `Create a viral short video script about: "${topic}". Style: ${style}. \nBreak it down into exactly 3-5 scenes. Return JSON matching this structure: {"title":"Video Title","scenes":[{"visual":"Description","voiceover":"Spoken text","estimatedDuration":5}]}`
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                visual: { type: Type.STRING },
                voiceover: { type: Type.STRING },
                estimatedDuration: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    }
  })
  const text = response.text
  if (!text) return null
  return JSON.parse(text)
}

export async function generateCaption(prompt: string) {
  if (!hasApiKey()) return (prompt.length > 10 ? prompt.slice(0, 10) + '…' : prompt)
  const ai = getClient()!
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Write a short, punchy video caption (max 10 words) based on this idea: "${prompt}". Return only the caption.`
  })
  return response.text?.trim() || null
}

export async function generateTTS(text: string, voiceName: string) {
  if (!hasApiKey()) return synthesizeBeepWavBase64(1, 523.25)
  const ai = getClient()!
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
    }
  })
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!base64Audio) throw new Error("No audio data returned from TTS")
  return base64Audio // Return raw base64; client will create blob
}
