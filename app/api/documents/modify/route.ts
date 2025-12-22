import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { Document, Packer, Paragraph, HeadingLevel } from "docx"
import { readRegistry, findLatestByKind, addToRegistry } from "@/lib/documents/registry"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const op = body?.op as string
    if (op !== "addSection") return NextResponse.json({ error: "unsupported op" }, { status: 400 })
    const heading: string = body?.heading || "New Section"
    const paragraphs: string[] = Array.isArray(body?.paragraphs) ? body.paragraphs : ["Lorem ipsum"]

    const list = await readRegistry()
    const latest = findLatestByKind(list, "docx")
    if (!latest?.url) return NextResponse.json({ error: "no docx found" }, { status: 404 })

    // Create a new file as an updated version (safe approach without merging)
    const outDir = path.join(process.cwd(), "public", "generated")
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const newFile = `updated-${ts}.docx`
    const newPath = path.join(outDir, newFile)

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ text: heading, heading: HeadingLevel.HEADING_2 }),
            ...paragraphs.map((p) => new Paragraph({ text: p })),
          ],
        },
      ],
    })
    const buf = await Packer.toBuffer(doc)
    await fs.writeFile(newPath, Buffer.from(buf))
    const newUrl = `/generated/${encodeURIComponent(newFile)}`
    await addToRegistry({ id: newFile, url: newUrl, kind: "docx", title: heading, createdAt: new Date().toISOString() })
    return NextResponse.json({ url: newUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
