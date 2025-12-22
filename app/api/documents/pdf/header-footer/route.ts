import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib"
import { readRegistry, findLatestByKind, addToRegistry } from "@/lib/documents/registry"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const header: string = body?.header || ""
    const footer: string = body?.footer || ""

    if (!header && !footer) return NextResponse.json({ error: 'no header/footer text' }, { status: 400 })

    const list = await readRegistry()
    const latest = findLatestByKind(list, 'pdf')
    if (!latest?.url) return NextResponse.json({ error: 'no pdf found' }, { status: 404 })
    const rel = latest.url.replace(/^\/+/, '')
    const filePath = path.join(process.cwd(), 'public', rel)

    const src = await fs.readFile(filePath)
    const pdfDoc = await PDFDocument.load(src)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages = pdfDoc.getPages()
    pages.forEach((p, i) => {
      const { width, height } = p.getSize()
      if (header) {
        p.drawText(header, { x: 40, y: height - 30, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
      }
      if (footer) {
        const text = footer.replace(/\{page\}/g, String(i + 1)).replace(/\{pages\}/g, String(pages.length))
        p.drawText(text, { x: 40, y: 20, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
      }
    })
    const out = await pdfDoc.save()
    const outDir = path.join(process.cwd(), 'public', 'generated')
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `header-footer-${ts}.pdf`
    const dest = path.join(outDir, filename)
    await fs.writeFile(dest, Buffer.from(out))
    const url = `/generated/${encodeURIComponent(filename)}`
    await addToRegistry({ id: filename, url, kind: 'pdf', title: 'HeaderFooter PDF', createdAt: new Date().toISOString() })
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
