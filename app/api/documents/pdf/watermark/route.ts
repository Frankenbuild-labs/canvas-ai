import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { readRegistry, findLatestByKind, addToRegistry } from "@/lib/documents/registry"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const text: string = body?.text || "CONFIDENTIAL"
    const opacity: number = Math.max(0.05, Math.min(0.5, Number(body?.opacity || 0.15)))

    const list = await readRegistry()
    const latest = findLatestByKind(list, 'pdf')
    if (!latest?.url) return NextResponse.json({ error: 'no pdf found' }, { status: 404 })
    const rel = latest.url.replace(/^\/+/, '')
    const filePath = path.join(process.cwd(), 'public', rel)

    const src = await fs.readFile(filePath)
    const pdfDoc = await PDFDocument.load(src)
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const pages = pdfDoc.getPages()
    for (const p of pages) {
      const { width, height } = p.getSize()
      p.drawText(text, {
        x: width / 2 - (text.length * 6),
        y: height / 2,
        size: 48,
        font,
        color: rgb(0.8, 0.1, 0.1),
        opacity,
  // rotate: { type: 'deg', angle: -30 }, // Removed due to type error
      })
    }
    const out = await pdfDoc.save()
    const outDir = path.join(process.cwd(), 'public', 'generated')
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `watermark-${ts}.pdf`
    const dest = path.join(outDir, filename)
    await fs.writeFile(dest, Buffer.from(out))
    const url = `/generated/${encodeURIComponent(filename)}`
    await addToRegistry({ id: filename, url, kind: 'pdf', title: 'Watermarked PDF', createdAt: new Date().toISOString() })
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
