import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

function colToNum(col: string) {
  let n = 0
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

function parseAddress(addr: string) {
  const m = addr.match(/^([A-Za-z]+)(\d+)$/)
  if (!m) throw new Error(`Invalid address: ${addr}`)
  return { col: colToNum(m[1]), row: parseInt(m[2], 10) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const range: string = body?.range || "A1:A1"
    const fill = body?.fill // { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }
    const font = body?.font // { name: 'Arial', size: 12, color: { argb: 'FF0000' }, bold: true }
    const alignment = body?.alignment // { horizontal: 'center', vertical: 'middle' }
    const border = body?.border // { top: {style:'thin'}, left: {...}, bottom: {...}, right: {...} }

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()
    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)

    const [start, end] = range.split(":")
    const { col: sc, row: sr } = parseAddress(start)
    const { col: ec, row: er } = parseAddress(end || start)
    const c1 = Math.min(sc, ec)
    const c2 = Math.max(sc, ec)
    const r1 = Math.min(sr, er)
    const r2 = Math.max(sr, er)
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cell = ws.getCell(r, c)
        if (fill) (cell as any).fill = fill
        if (font) (cell as any).font = font
        if (alignment) (cell as any).alignment = alignment
        if (border) (cell as any).border = border
      }
    }

    const { url } = await saveWorkbook(wb, `format-range-${sheetName}`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
