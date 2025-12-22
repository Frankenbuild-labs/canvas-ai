export interface GenerateOptions {
  text: string
  voice: string
  format?: 'wav' | 'opus'
  speed?: number
  seed?: number
  temperature?: number
}

export interface GenerationResult {
  audio: Buffer
  format: string
  durationSeconds: number
  characterCount: number
}

export interface TTSProvider {
  generate(opts: GenerateOptions): Promise<GenerationResult>
}
