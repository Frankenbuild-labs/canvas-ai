import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { Document, Packer, Paragraph, HeadingLevel, ImageRun } from "docx"
import { readRegistry, findLatestByKind, addToRegistry } from "@/lib/documents/registry"
import { extractTextFromDocx } from "@/lib/documents/docx-text"

async function loadPublicAssetBytes(publicUrl: string): Promise<Buffer> {
  // Convert a public URL like /images/logo.png to filesystem path under public
  const rel = publicUrl.replace(/^\/+/, "")
  const filePath = path.join(process.cwd(), "public", rel)
  return fs.readFile(filePath)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const text: string = (body?.text || "").toString()
    const logoUrl: string = (body?.logoUrl || "/placeholder-logo.png").toString()
    const maxWidth: number = Number(body?.maxWidth || 480)

    const list = await readRegistry()
    const latest = findLatestByKind(list, "docx")
    if (!latest?.url) return NextResponse.json({ error: "no docx found" }, { status: 404 })

    const raw = await extractTextFromDocx(latest.url)
    const paras = raw.split(/\n+/)

    // read logo bytes
    const imageBytes = await loadPublicAssetBytes(logoUrl)

    const outDir = path.join(process.cwd(), "public", "generated")
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `header-logo-${ts}.docx`
    const dest = path.join(outDir, filename)

    const headerChildren = [
      new Paragraph({ children: [new ImageRun({ data: imageBytes, transformation: { width: maxWidth, height: maxWidth * 0.25 }, type: "png" })] }),
    ]
    if (text) headerChildren.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2 }))

    const doc = new Document({
      sections: [
        { properties: {}, children: [...headerChildren, ...paras.map((p) => new Paragraph({ text: p }))] },
      ],
    })
    const buf = await Packer.toBuffer(doc)
    await fs.writeFile(dest, Buffer.from(buf))
    const url = `/generated/${encodeURIComponent(filename)}`
    await addToRegistry({ id: filename, url, kind: "docx", title: `Header Logo`, createdAt: new Date().toISOString() })
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
