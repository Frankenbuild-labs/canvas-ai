import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import ExcelJS from "exceljs"
import { addToRegistry } from "@/lib/documents/registry"
import { resolveGeneratedPathFromIdOrUrl, publicUrlForGenerated } from "../_utils"

type RangeRule = {
  address: string
  bold?: boolean
  italic?: boolean
  numFmt?: string
  width?: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const documentId: string = body?.documentId || body?.url || ""
    const _rules: RangeRule[] = Array.isArray(body?.rules) ? body.rules : []

    if (!documentId) return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    const { filename, filePath } = resolveGeneratedPathFromIdOrUrl(documentId)
    const kind = (filename.split(".").pop() || "").toLowerCase()

    const newName = filename.replace(/(\.[a-z0-9]+)$/i, (_, ext) => `.fmt${Date.now()}${ext}`)
    const outPath = path.join(process.cwd(), "public", "generated", newName)
    await fs.mkdir(path.dirname(outPath), { recursive: true })

    if (kind === "xlsx") {
      // Implement basic formatting over ranges
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.readFile(filePath)
      const ws = wb.worksheets[0]
      if (ws && Array.isArray(_rules)) {
        for (const rule of _rules) {
          const addr = String(rule.address || "").trim()
          if (!addr) continue
          // Column range like B:B
          const colMatch = addr.match(/^([A-Za-z]+):\1$/)
          if (colMatch) {
            const col = ws.getColumn(colMatch[1])
            if (rule.width) col.width = rule.width
            if (rule.numFmt) col.numFmt = rule.numFmt
            continue
          }
          // Row range like 3:3
          const rowMatch = addr.match(/^(\d+):(\d+)$/)
          if (rowMatch && rowMatch[1] === rowMatch[2]) {
            const r = ws.getRow(parseInt(rowMatch[1], 10))
            r.eachCell((cell) => {
              const font: any = { ...(cell.font || {}) }
              if (rule.bold !== undefined) font.bold = rule.bold
              if (rule.italic !== undefined) font.italic = rule.italic
              cell.font = font
              if (rule.numFmt) cell.numFmt = rule.numFmt
            })
            continue
          }
          // Cell range like A1:D10 or single cell like A1
          const [startAddr, endAddr] = addr.includes(":") ? addr.split(":") : [addr, addr]
          const startCell = ws.getCell(startAddr)
          const endCell = ws.getCell(endAddr)
          const startRow = Number((startCell as any).row)
          const endRow = Number((endCell as any).row)
          const startCol = Number((startCell as any).col)
          const endCol = Number((endCell as any).col)
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const cell = ws.getCell(r, c)
              const font: any = { ...(cell.font || {}) }
              if (rule.bold !== undefined) font.bold = rule.bold
              if (rule.italic !== undefined) font.italic = rule.italic
              cell.font = font
              if (rule.numFmt) cell.numFmt = rule.numFmt
            }
          }
        }
      }
      await wb.xlsx.writeFile(outPath)
    } else if (kind === "docx" || kind === "pdf" || kind === "pptx") {
      await fs.copyFile(filePath, outPath)
    } else {
      return NextResponse.json({ error: `Unsupported kind: ${kind}` }, { status: 400 })
    }

    const url = publicUrlForGenerated(newName)
    await addToRegistry({ id: newName, url: `/generated/${encodeURIComponent(newName)}`, kind: kind as any, title: `Formatted ${filename}`, createdAt: new Date().toISOString() })
    try {
      await fetch(new URL("/api/memory/remember", req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "edit", docId: filename, action: "format", resultUrl: url }),
      })
    } catch {}
    return NextResponse.json({ url, filename: newName })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
 
