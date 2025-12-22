import { NextRequest, NextResponse } from "next/server"
import { readRegistry, findLatestByKind } from "@/lib/documents/registry"
import { extractTextFromDocx } from "@/lib/documents/docx-text"

export async function GET() {
  try {
    const list = await readRegistry()
    const latest = findLatestByKind(list, "docx")
    if (!latest?.url) return NextResponse.json({ count: 0 })
    const text = await extractTextFromDocx(latest.url)
    const count = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length
    return NextResponse.json({ count, url: latest.url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
