import { type NextRequest, NextResponse } from "next/server"
// Uses request.url/search params and may perform remote fetch; ensure dynamic rendering
export const dynamic = 'force-dynamic'
import path from "path"
import fs from "fs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get("file")
    const src = searchParams.get("src")

    if (!filename && !src) {
      return NextResponse.json({ error: "Provide either file or src" }, { status: 400 })
    }

    // Remote proxy mode: allow select hosts
    if (src) {
      const allowedHosts = [
        "raw.githubusercontent.com",
        "githubusercontent.com",
        "filesamples.com",
        "file-examples.com",
      ]
      let url: URL
      try {
        url = new URL(src)
      } catch {
        return NextResponse.json({ error: "Invalid src URL" }, { status: 400 })
      }
      if (!allowedHosts.some((h) => url.hostname.endsWith(h))) {
        return NextResponse.json({ error: "Source host not allowed" }, { status: 403 })
      }

      const upstream = await fetch(url.toString(), { headers: { "User-Agent": "CanvasAI-Proxy" } })
      if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 })
      }
      const headers = new Headers()
      const ct = upstream.headers.get("content-type") || "application/octet-stream"
      headers.set("Content-Type", ct)
      // Pass length if known
      const len = upstream.headers.get("content-length")
      if (len) headers.set("Content-Length", len)
      // Suggest a filename
      const name = path.basename(url.pathname) || "file"
      headers.set("Content-Disposition", `attachment; filename="${name}"`)
      return new NextResponse(upstream.body as any, { headers })
    }

    // Local file mode
    const documentsDir = path.join(process.cwd(), "documents")
    const filePath = path.join(documentsDir, filename!)
    if (!filePath.startsWith(documentsDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 403 })
    }
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    const fileBuffer = fs.readFileSync(filePath)
    const ext = path.extname(filename!).toLowerCase()
    let contentType = "application/octet-stream"
    switch (ext) {
      case ".pdf":
        contentType = "application/pdf"
        break
      case ".docx":
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        break
      case ".xlsx":
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        break
      case ".pptx":
        contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        break
    }
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
