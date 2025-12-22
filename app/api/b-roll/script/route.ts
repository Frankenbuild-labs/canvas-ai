import { NextResponse } from "next/server"
import { z } from "zod"
import { generateVideoScript } from "@lib/ai/gemini"

const bodySchema = z.object({
  topic: z.string().min(2),
  style: z.string().min(2)
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const { topic, style } = bodySchema.parse(json)
    const script = await generateVideoScript(topic, style)
    return NextResponse.json({ script })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
