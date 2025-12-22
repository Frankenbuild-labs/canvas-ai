import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET(_req: NextRequest) {
  try {
    const base = path.join(process.cwd(), "public", "templates")
    const kinds: Array<{ kind: "docx" | "xlsx" | "pdf"; ext: string }> = [
      { kind: "docx", ext: ".docx" },
      { kind: "xlsx", ext: ".xlsx" },
      { kind: "pdf", ext: ".pdf" },
    ]
    const results: Array<{ id: string; title: string; kind: string; url: string }> = []
    for (const { kind, ext } of kinds) {
      const dir = path.join(base, kind)
      const files = await fs.readdir(dir).catch(() => [])
      for (const f of files) {
        if (!f.toLowerCase().endsWith(ext)) continue
        const id = f.slice(0, -ext.length)
        results.push({
          id,
          title: id.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
          kind,
          url: `/templates/${kind}/${encodeURIComponent(f)}`,
        })
      }
    }
    results.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title))
    return NextResponse.json({ templates: results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
