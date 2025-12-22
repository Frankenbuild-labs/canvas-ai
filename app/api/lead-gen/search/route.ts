import { NextResponse } from "next/server"
import { z } from "zod"
import { generateLeads } from "@lib/ai/leadgen"

const bodySchema = z.object({
  keywords: z.string().min(2),
  location: z.string().min(2),
  platform: z.string().min(2),
  depth: z.string().min(2),
  includeEmail: z.boolean().default(true),
  includePhone: z.boolean().default(false),
  targetRole: z.string().min(2),
  industry: z.string().min(2)
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const params = bodySchema.parse(json)
    const leads = await generateLeads(params)
    return NextResponse.json({ leads })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
