import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { Document, Packer, Paragraph } from "docx"
import { readRegistry, findLatestByKind, addToRegistry } from "@/lib/documents/registry"
import { extractTextFromDocx } from "@/lib/documents/docx-text"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const find: string = body?.find || ""
    const replaceWith: string = body?.replaceWith || ""
    if (!find) return NextResponse.json({ error: "missing 'find'" }, { status: 400 })

    const list = await readRegistry()
    const latest = findLatestByKind(list, "docx")
    if (!latest?.url) return NextResponse.json({ error: "no docx found" }, { status: 404 })

    const text = await extractTextFromDocx(latest.url)
    const replaced = text.split(find).join(replaceWith)

    // Write a simple docx with replaced content (flat paragraphs)
    const outDir = path.join(process.cwd(), "public", "generated")
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `find-replace-${ts}.docx`
    const dest = path.join(outDir, filename)
    const doc = new Document({
      sections: [
        { properties: {}, children: replaced.split(/\n+/).map((line) => new Paragraph({ text: line })) },
      ],
    })
    const buf = await Packer.toBuffer(doc)
    await fs.writeFile(dest, Buffer.from(buf))
    const url = `/generated/${encodeURIComponent(filename)}`
    await addToRegistry({ id: filename, url, kind: "docx", title: `Find-Replace ${find}`, createdAt: new Date().toISOString() })
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
