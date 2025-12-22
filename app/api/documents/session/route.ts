import { NextRequest, NextResponse } from "next/server"
import { buildEditorConfig } from "@/lib/onlyoffice/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      documentType,
      fileType,
      title,
      url,
      mode = "edit",
    } = body || {}

    if (!url || !fileType || !documentType || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Prefer a Docker-friendly callback base if provided; fall back to NEXT_PUBLIC_BASE_URL
    const baseForCallback = process.env.ONLYOFFICE_CALLBACK_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL
    const callbackUrl = baseForCallback
      ? `${baseForCallback}/api/documents/callback`
      : undefined

    // Prefer server-controlled URLs so container fetches are stable even if client env is stale
    // Normalize fileType to avoid issues like "docx?x=y" or uppercase
    const ft = (fileType || "").toLowerCase().split("?")[0].split("#")[0]

    const serverUrlMap: Record<string, string | undefined> = {
      docx: process.env.ONLYOFFICE_DOC_URL,
      doc: process.env.ONLYOFFICE_DOC_URL,
      xlsx: process.env.ONLYOFFICE_SHEET_URL,
      xls: process.env.ONLYOFFICE_SHEET_URL,
      pdf: process.env.ONLYOFFICE_PDF_URL,
    }
    let effectiveUrl = url || serverUrlMap[ft]
    // If relative, prefix with a base URL the Document Server can reach
    if (effectiveUrl && effectiveUrl.startsWith('/')) {
      const baseForFiles = process.env.ONLYOFFICE_FILE_BASE_URL || process.env.ONLYOFFICE_CALLBACK_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL
      if (baseForFiles) {
        effectiveUrl = `${baseForFiles.replace(/\/$/, '')}${effectiveUrl}`
      }
    }

  const { config, token, documentServerUrl } = buildEditorConfig({
      documentType,
      fileType: ft || fileType,
      title,
      url: effectiveUrl,
      mode,
      callbackUrl,
      user: { id: "demo-user", name: "CanvasAI" },
    })

  return NextResponse.json({ config, token, documentServerUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 })
  }
}
