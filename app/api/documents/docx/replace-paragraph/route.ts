import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { Document, Packer, Paragraph } from "docx"
import { readRegistry, findLatestByKind, addToRegistry } from "@/lib/documents/registry"
import { extractTextFromDocx } from "@/lib/documents/docx-text"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const index: number = Number(body?.index || 2) // default second paragraph (1-based for user)
    const text: string = body?.text || ""
    if (!text) return NextResponse.json({ error: "missing 'text'" }, { status: 400 })

    const list = await readRegistry()
    const latest = findLatestByKind(list, "docx")
    if (!latest?.url) return NextResponse.json({ error: "no docx found" }, { status: 404 })

    const raw = await extractTextFromDocx(latest.url)
    const paras = raw.split(/\n+/)
    const idx0 = Math.max(0, index - 1)
    if (idx0 >= paras.length) return NextResponse.json({ error: "paragraph index out of range" }, { status: 400 })
    paras[idx0] = text

    const outDir = path.join(process.cwd(), "public", "generated")
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `replace-para-${index}-${ts}.docx`
    const dest = path.join(outDir, filename)
    const doc = new Document({
      sections: [
        { properties: {}, children: paras.map((p) => new Paragraph({ text: p })) },
      ],
    })
    const buf = await Packer.toBuffer(doc)
    await fs.writeFile(dest, Buffer.from(buf))
    const url = `/generated/${encodeURIComponent(filename)}`
    await addToRegistry({ id: filename, url, kind: "docx", title: `Replace P${index}`, createdAt: new Date().toISOString() })
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
