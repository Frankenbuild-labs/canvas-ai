import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export const runtime = 'nodejs'

// Serve files from the local ./uploads directory
// Example: GET /uploads/voice-audio/abc.mp3 -> ./uploads/voice-audio/abc.mp3

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const segments = params.path || []
    // Prevent path traversal
    const safeSegments = segments.filter((seg) => !seg.includes("..") && !path.isAbsolute(seg))
    const filePath = path.join(process.cwd(), "./uploads", ...safeSegments)

    // Ensure filePath is still within the uploads directory
    const baseDir = path.join(process.cwd(), "./uploads")
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(path.resolve(baseDir))) {
      return new NextResponse("Forbidden", { status: 403 })
    }

  const buf = await fs.readFile(resolved)
    const ext = path.extname(resolved).toLowerCase()

    let contentType = "application/octet-stream"
    if (ext === ".mp3") contentType = "audio/mpeg"
    else if (ext === ".wav") contentType = "audio/wav"
    else if (ext === ".ogg") contentType = "audio/ogg"
    else if (ext === ".m4a") contentType = "audio/mp4"
    else if (ext === ".json") contentType = "application/json"

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (err: any) {
    if (err && err.code === "ENOENT") {
      return new NextResponse("Not Found", { status: 404 })
    }
    console.error("Static uploads serve error:", err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
