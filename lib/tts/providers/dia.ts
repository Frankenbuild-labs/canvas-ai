import { GenerateOptions, GenerationResult, TTSProvider } from '../provider'

const DIA_TTS_URL = process.env.DIA_TTS_URL || 'http://localhost:8003'

export class DiaProvider implements TTSProvider {
  async generate(opts: GenerateOptions): Promise<GenerationResult> {
    const format = (opts.format === 'opus' ? 'opus' : 'wav')
    
    // Check if this is a cloned voice (filename with extension) or predefined voice
    const isClonedOrPredefined = opts.voice && (opts.voice.includes('.') || opts.voice.includes('/'))
    
    let response: Response
    
    if (isClonedOrPredefined) {
      // Use the /tts endpoint for cloned voices with more control
      response = await fetch(`${DIA_TTS_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: opts.text,
          voice_mode: 'clone',
          clone_reference_filename: opts.voice,
          output_format: format,
          speed_factor: opts.speed ?? 1.0,
          seed: opts.seed ?? -1,
          temperature: opts.temperature ?? 0.7,
          cfg_scale: 2.5,
          top_p: 0.9,
          cfg_filter_top_k: 200,
        }),
      })
    } else {
      // Use OpenAI-compatible endpoint for standard voices (S1, S2, dialogue)
      response = await fetch(`${DIA_TTS_URL}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: opts.text,
          voice: opts.voice || 'S1',
          response_format: format,
          speed: opts.speed ?? 1.0,
          seed: opts.seed ?? -1,
          temperature: opts.temperature,
        }),
      })
    }
    
    if (!response.ok) {
      let detail: any = undefined
      try { detail = await response.json() } catch {}
      throw new Error(detail?.detail || detail?.error || `Dia TTS upstream status ${response.status}`)
    }
    const arrayBuf = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)
    // Rough duration estimate (same heuristic as routes)
    const bytesPerSecond = format === 'wav' ? 176000 : 16000
    const durationSeconds = buffer.length / bytesPerSecond
    return {
      audio: buffer,
      format,
      durationSeconds,
      characterCount: opts.text.length,
    }
  }
}

let _dia: DiaProvider | null = null
export function getDiaProvider(): DiaProvider {
  if (!_dia) _dia = new DiaProvider()
  return _dia
}
