import { NextRequest, NextResponse } from "next/server"
import { readRegistry, findLatestByKind } from "@/lib/documents/registry"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const kind = (searchParams.get("kind") || "docx").toLowerCase() as "docx" | "xlsx" | "pdf" | "pptx"
    // 'hint' reserved for future use (semantics)
    const list = await readRegistry()
    const latest = findLatestByKind(list, kind)
    const url = latest?.url || null
    if (url) {
      try {
        const parts = url.split("/")
        const docId = decodeURIComponent(parts[parts.length - 1] || "")
        await fetch(new URL("/api/memory/remember", req.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "open", docId }),
        })
      } catch {}
    }
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
