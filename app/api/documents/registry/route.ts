import { NextRequest, NextResponse } from "next/server"
import { readRegistry } from "@/lib/documents/registry"
import { promises as fs } from "fs"
import path from "path"
import type { DocEntry } from "@/lib/documents/registry"

export async function GET() {
  try {
    const list = await readRegistry()
    return NextResponse.json({ items: list })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, url } = await req.json().catch(() => ({}))
    const file = path.join(process.cwd(), "uploads", "doc-registry.json")
    const raw = await fs.readFile(file, "utf8").catch(() => "[]")
    let list: DocEntry[] = []
    try { list = JSON.parse(raw) } catch { list = [] }
    const next = list.filter((e) => (id ? e.id !== id : true) && (url ? e.url !== url : true))
    await fs.writeFile(file, JSON.stringify(next, null, 2), "utf8")
    return NextResponse.json({ ok: true, items: next })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
