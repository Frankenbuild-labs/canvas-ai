import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { PDFDocument } from "pdf-lib"
import { readRegistry, findLatestByKind, addToRegistry } from "@/lib/documents/registry"

async function readPublicFile(publicUrl: string) {
  const rel = publicUrl.replace(/^\/+/, '')
  const abs = path.join(process.cwd(), 'public', rel)
  return fs.readFile(abs)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const otherUrl: string = body?.otherUrl
    if (!otherUrl) return NextResponse.json({ error: 'missing otherUrl' }, { status: 400 })

    const list = await readRegistry()
    const latest = findLatestByKind(list, 'pdf')
    if (!latest?.url) return NextResponse.json({ error: 'no pdf found' }, { status: 404 })

    const current = await readPublicFile(latest.url)
    const other = await readPublicFile(otherUrl)

    const pdf1 = await PDFDocument.load(current)
    const pdf2 = await PDFDocument.load(other)
    const outDoc = await PDFDocument.create()
    const pages1 = await outDoc.copyPages(pdf1, pdf1.getPageIndices())
    pages1.forEach(p => outDoc.addPage(p))
    const pages2 = await outDoc.copyPages(pdf2, pdf2.getPageIndices())
    pages2.forEach(p => outDoc.addPage(p))
    const out = await outDoc.save()

    const outDir = path.join(process.cwd(), 'public', 'generated')
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `merged-${ts}.pdf`
    const dest = path.join(outDir, filename)
    await fs.writeFile(dest, Buffer.from(out))
    const url = `/generated/${encodeURIComponent(filename)}`
    await addToRegistry({ id: filename, url, kind: 'pdf', title: 'Merged PDF', createdAt: new Date().toISOString() })
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
