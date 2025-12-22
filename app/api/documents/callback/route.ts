import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { promises as fs } from "fs"
import path from "path"

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.ONLYOFFICE_JWT_SECRET
    let payload: any

    // Prefer Authorization: Bearer <token>
    const auth = req.headers.get("authorization") || req.headers.get("Authorization")
    if (secret && auth && auth.toLowerCase().startsWith("bearer ")) {
      const token = auth.slice(7)
      payload = jwt.verify(token, secret)
    } else {
      const body = await req.json().catch(() => ({}))
      if (secret && body && body.token) {
        payload = jwt.verify(body.token, secret)
      } else {
        payload = body
      }
    }

    // Persist for inspection (optional)
    try {
      const dir = path.join(process.cwd(), "uploads", "onlyoffice-callbacks")
      await fs.mkdir(dir, { recursive: true })
      const ts = new Date().toISOString().replace(/[:.]/g, "-")
      const file = path.join(dir, `callback-${ts}.json`)
      await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8")
    } catch {}

    // Handle OnlyOffice status codes
    // 1 - Editing, 2 - MustSave, 3 - Corrupted, 4 - Closed w/o changes, 6 - MustForceSave, etc.
    // We will download updated file on 2 (save) or 6 (force save)
    const status: number | undefined = payload?.status
    const key: string | undefined = payload?.key
    const url: string | undefined = payload?.url

    if ((status === 2 || status === 6) && url && key) {
      try {
        const res = await fetch(url)
        if (!res.ok || !res.body) {
          // respond with non-zero error so Document Server can retry
          return NextResponse.json({ error: 1, message: `Upstream ${res.status}` })
        }
        const storageDir = path.join(process.cwd(), "uploads", "onlyoffice-storage", key)
        await fs.mkdir(storageDir, { recursive: true })
        // File extension is included in the url filename, save as latest
        const filename = payload?.changesurl ? "changes.zip" : (payload?.filetype ? `document.${payload.filetype}` : "document.bin")
        const filePath = path.join(storageDir, filename)
        const fileData = Buffer.from(await res.arrayBuffer())
        await fs.writeFile(filePath, fileData)
        // success
        return NextResponse.json({ error: 0 })
      } catch (e: any) {
        return NextResponse.json({ error: 1, message: e?.message || "Download failed" })
      }
    }

    // OnlyOffice expects { error: 0 } on success to avoid prompting user to download
    return NextResponse.json({ error: 0 })
  } catch (e: any) {
    // Non-zero error codes indicate failure to OnlyOffice; use generic error code 1
    return NextResponse.json({ error: 1, message: e?.message || "Invalid payload" }, { status: 200 })
  }
}
