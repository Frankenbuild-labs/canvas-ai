import { NextResponse } from "next/server"
import { z } from "zod"
import { generateCaption } from "@lib/ai/gemini"

const bodySchema = z.object({ prompt: z.string().min(2) })

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const { prompt } = bodySchema.parse(json)
    const caption = await generateCaption(prompt)
    return NextResponse.json({ caption })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
