import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
  const tab = (searchParams.get("tab") || "docs") as "docs" | "sheets" | "pdf" | "slides"
  const ext = tab === "docs" ? "docx" : tab === "sheets" ? "xlsx" : tab === "slides" ? "pptx" : "pdf"

    const base = path.join(process.cwd(), "uploads", "onlyoffice-storage")
    let latestPath: string | null = null
    let latestTime = 0

    const keys = await fs.readdir(base).catch(() => [])
    for (const key of keys) {
      const dir = path.join(base, key)
      const stat = await fs.stat(dir).catch(() => null)
      if (!stat || !stat.isDirectory()) continue
      const candidate = path.join(dir, `document.${ext}`)
      const cstat = await fs.stat(candidate).catch(() => null)
      if (cstat && cstat.isFile()) {
        const mtime = cstat.mtimeMs
        if (mtime > latestTime) {
          latestTime = mtime
          latestPath = candidate
        }
      }
    }

    if (!latestPath) return NextResponse.json({ url: null })

    // Serve via a simple file handler using /api/documents/download?file= with relative path wasn’t designed for uploads.
    // Expose via a static route: map uploads/onlyoffice-storage through /uploads path (Next can serve public/ only).
    // For now, create a public symlinked copy on demand.
    const publicDir = path.join(process.cwd(), "public", "generated")
    await fs.mkdir(publicDir, { recursive: true })
  const name = `latest-${ext}`
  const publicPath = path.join(publicDir, name + "." + ext)
    const buf = await fs.readFile(latestPath)
    await fs.writeFile(publicPath, buf)
    const url = `/generated/${encodeURIComponent(name + "." + ext)}`
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
