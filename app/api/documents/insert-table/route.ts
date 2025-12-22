import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun } from "docx"
import ExcelJS from "exceljs"
import { addToRegistry } from "@/lib/documents/registry"
import { resolveGeneratedPathFromIdOrUrl, publicUrlForGenerated } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const documentId: string = body?.documentId || body?.url || ""
    const headers: string[] = Array.isArray(body?.headers) ? body.headers : []
    const rows: any[][] = Array.isArray(body?.rows) ? body.rows : []
    const title: string = body?.title || "Inserted Table"

    if (!documentId) return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    const { filename } = resolveGeneratedPathFromIdOrUrl(documentId)
    const kind = (filename.split(".").pop() || "").toLowerCase()

    const newName = filename.replace(/(\.[a-z0-9]+)$/i, (_, ext) => `.table${Date.now()}${ext}`)
    const outPath = path.join(process.cwd(), "public", "generated", newName)
    await fs.mkdir(path.dirname(outPath), { recursive: true })

    if (kind === "docx") {
      const children: any[] = []
      children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }))
      const tableRows: TableRow[] = []
      if (headers.length) {
        tableRows.push(new TableRow({ children: headers.map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(h), bold: true })] })] })) }))
      }
      for (const r of rows) {
        const cells = (Array.isArray(r) ? r : [r]).map(c => new TableCell({ children: [new Paragraph(String(c))] }))
        tableRows.push(new TableRow({ children: cells }))
      }
      children.push(new Table({ rows: tableRows }))
      const doc = new Document({ sections: [{ properties: {}, children }] })
      const buf = await Packer.toBuffer(doc)
      await fs.writeFile(outPath, Buffer.from(buf))
    } else if (kind === "xlsx") {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet("Data")
      if (headers.length) {
        ws.addRow(headers)
        ws.getRow(1).font = { bold: true }
      }
      for (const r of rows) ws.addRow(Array.isArray(r) ? r : [r])
      ws.columns = (headers.length ? headers : rows[0] || []).map((h: any) => ({ width: Math.min(Math.max(String(h||"").length + 4, 12), 36) }))
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
      await fetch(new URL("/api/memory/remember", req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "edit", docId: filename, action: "insert-table", resultUrl: url }),
      })
    } catch {}
    return NextResponse.json({ url, filename: newName })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
 
