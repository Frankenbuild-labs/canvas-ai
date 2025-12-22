import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

function columnToNumber(col: string) {
  let n = 0
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const column: string = body?.column || "B"
    const startRow: number = Number(body?.startRow || 2)
    const endRow: number = Number(body?.endRow || 100)
    const outCell: string = body?.outCell || `${column}${endRow + 1}`

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()
    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)

    const colIdx = columnToNumber(column)
    let sum = 0
    for (let r = startRow; r <= endRow; r++) {
      const v = ws.getCell(r, colIdx).value
      const num = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN
      if (!Number.isNaN(num)) sum += num
    }
    ws.getCell(outCell).value = sum

    const { url } = await saveWorkbook(wb, `sum-${sheetName}-${column}${startRow}-${endRow}`)
    return NextResponse.json({ url, sum })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
