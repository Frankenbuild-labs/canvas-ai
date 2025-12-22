import { NextResponse } from "next/server"
import { z } from "zod"
import { generateTTS } from "@lib/ai/gemini"

const bodySchema = z.object({ text: z.string().min(2), voiceName: z.string().min(2) })

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const { text, voiceName } = bodySchema.parse(json)
    const base64 = await generateTTS(text, voiceName)
    return NextResponse.json({ audioBase64: base64 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
