import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { Document, Packer, Paragraph, HeadingLevel } from "docx"
import { addToRegistry } from "@/lib/documents/registry"
import { resolveGeneratedPathFromIdOrUrl, publicUrlForGenerated } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const documentId: string = body?.documentId || body?.url || ""
    const instruction: string = body?.instruction || ""

    if (!documentId || typeof documentId !== "string") {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    }

    const { filename } = resolveGeneratedPathFromIdOrUrl(documentId)
    const kind = (filename.split(".").pop() || "").toLowerCase()

    // Minimal approach: we don't mutate the original file; we create a new version with an appended section.
    const newName = filename.replace(/(\.[a-z0-9]+)$/i, (_, ext) => `.edited${Date.now()}${ext}`)
    const outPath = path.join(process.cwd(), "public", "generated", newName)

    if (kind === "docx") {
      const edits = instruction || "Document updated by Executive Agent."
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({ text: "Executive Edits", heading: HeadingLevel.HEADING_1 }),
              new Paragraph({ text: new Date().toLocaleString() }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: edits }),
            ],
          },
        ],
      })
      const buf = await Packer.toBuffer(doc)
      await fs.mkdir(path.dirname(outPath), { recursive: true })
      await fs.writeFile(outPath, Buffer.from(buf))
    } else if (kind === "xlsx" || kind === "pdf" || kind === "pptx") {
      // For now, copy the original file to newName to keep the pipeline stable
      const { filePath } = resolveGeneratedPathFromIdOrUrl(documentId)
      await fs.mkdir(path.dirname(outPath), { recursive: true })
      await fs.copyFile(filePath, outPath)
    } else {
      return NextResponse.json({ error: `Unsupported kind: ${kind}` }, { status: 400 })
    }

    const url = publicUrlForGenerated(newName)
    await addToRegistry({ id: newName, url: `/generated/${encodeURIComponent(newName)}`, kind: kind as any, title: `Edited ${filename}`, createdAt: new Date().toISOString() })
    // Remember edit action
    try {
      await fetch(new URL("/api/memory/remember", req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "edit", docId: filename, action: "edit", resultUrl: url }),
      })
    } catch {}
    return NextResponse.json({ url, filename: newName })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
 
