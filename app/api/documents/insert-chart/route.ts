import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { Document, Packer, Paragraph, HeadingLevel, ImageRun } from "docx"
import ExcelJS from "exceljs"
import { addToRegistry } from "@/lib/documents/registry"
import { resolveGeneratedPathFromIdOrUrl, publicUrlForGenerated } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const documentId: string = body?.documentId || body?.url || ""
    const title: string = body?.title || "Inserted Chart"
    const chartUrl: string | undefined = body?.chartUrl
    const config: any = body?.config
    const width: number = Number(body?.width || 640)
    const height: number = Number(body?.height || 360)

    if (!documentId) return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    const { filename } = resolveGeneratedPathFromIdOrUrl(documentId)
    const kind = (filename.split(".").pop() || "").toLowerCase()

    let urlToFetch = chartUrl
    if (!urlToFetch && config) {
      const encoded = encodeURIComponent(JSON.stringify(config))
      urlToFetch = `https://quickchart.io/chart?c=${encoded}`
    }

    const newName = filename.replace(/(\.[a-z0-9]+)$/i, (_, ext) => `.chart${Date.now()}${ext}`)
    const outPath = path.join(process.cwd(), "public", "generated", newName)
    await fs.mkdir(path.dirname(outPath), { recursive: true })

    if (kind === "docx") {
      const children: any[] = []
      children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }))
      if (urlToFetch) {
        const res = await fetch(urlToFetch)
        if (res.ok) {
          const arr = new Uint8Array(await res.arrayBuffer())
          const img = new ImageRun({ data: Buffer.from(arr), transformation: { width, height } } as any)
          children.push(new Paragraph({ children: [img] }))
        }
        children.push(new Paragraph({ text: urlToFetch }))
      } else {
        children.push(new Paragraph({ text: "Chart config or URL not provided" }))
      }
      const doc = new Document({ sections: [{ properties: {}, children }] })
      const buf = await Packer.toBuffer(doc)
      await fs.writeFile(outPath, Buffer.from(buf))
    } else if (kind === "xlsx") {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet("Charts")
      ws.getCell("A1").value = title
      if (urlToFetch) {
        const res = await fetch(urlToFetch)
        if (res.ok) {
          const arr = new Uint8Array(await res.arrayBuffer())
          const id = (wb as any).addImage({ buffer: Buffer.from(arr) as any, extension: "png" as any })
          ;(ws as any).addImage(id, { tl: { col: 0, row: 2 }, ext: { width, height } })
        }
        ws.getCell("A2").value = urlToFetch
      } else {
        ws.getCell("A2").value = "Chart config or URL not provided"
      }
      const ab = (await wb.xlsx.writeBuffer()) as ArrayBuffer
      await fs.writeFile(outPath, Buffer.from(ab))
    } else if (kind === "pdf" || kind === "pptx") {
      const { filePath } = resolveGeneratedPathFromIdOrUrl(documentId)
      await fs.copyFile(filePath, outPath)
    } else {
      return NextResponse.json({ error: `Unsupported kind: ${kind}` }, { status: 400 })
    }

    const url = publicUrlForGenerated(newName)
    await addToRegistry({ id: newName, url: `/generated/${encodeURIComponent(newName)}`, kind: kind as any, title, createdAt: new Date().toISOString() })
    try {
      const base = new URL("/api/memory/remember", req.url)
      await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "edit", docId: filename, action: "insert-chart", resultUrl: url }),
      })
      if (urlToFetch) {
        await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "image", docId: filename, url: urlToFetch, caption: title }),
        })
      }
    } catch {}
    return NextResponse.json({ url, filename: newName })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
 
