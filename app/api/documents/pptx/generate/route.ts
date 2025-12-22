import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
// Use Node runtime and dynamic import to avoid bundling issues
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { addToRegistry } from "@/lib/documents/registry"

type SlideInput = {
  title?: string
  bullets?: string[]
  notes?: string
}

export async function POST(req: NextRequest) {
  try {
    // Resolve pptxgenjs at runtime to avoid static bundling issues
    let PptxGenJS: any
    try {
      const reqr: any = (eval as any)("require")
      const modName = "pptx" + "genjs"
      PptxGenJS = reqr(modName)
      PptxGenJS = PptxGenJS?.default || PptxGenJS
    } catch (e: any) {
      return NextResponse.json({ error: "pptxgenjs not available on server runtime" }, { status: 500 })
    }
    const body = await req.json().catch(() => ({}))
    const title: string = body?.title || "Presentation"
    const slides: SlideInput[] = Array.isArray(body?.slides) ? body.slides : []

    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_16x9'

    // Title slide
    const s0 = pptx.addSlide()
    s0.addText(title, { x: 0.5, y: 1.5, w: 9, h: 1, fontSize: 36, bold: true, align: 'center' })

    // Content slides
    for (const s of slides) {
      const slide = pptx.addSlide()
      if (s.title) slide.addText(s.title, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true })
      if (Array.isArray(s.bullets) && s.bullets.length) {
        slide.addText(
          s.bullets.map((b: string) => ({ text: b, options: { bullet: true } })),
          { x: 0.8, y: 1.5, w: 8.5, h: 4, fontSize: 18 }
        )
      }
      if (s.notes) (slide as any).addNotes?.(s.notes)
    }

    const outDir = path.join(process.cwd(), "public", "generated")
    await fs.mkdir(outDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'presentation'}-${ts}.pptx`
    const filePath = path.join(outDir, filename)

    const buf: Buffer = await (pptx as any).write('nodebuffer')
    await fs.writeFile(filePath, Buffer.from(buf))
    const url = `/generated/${encodeURIComponent(filename)}`

    await addToRegistry({ id: filename, url, kind: 'pptx', title, createdAt: new Date().toISOString() })
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
