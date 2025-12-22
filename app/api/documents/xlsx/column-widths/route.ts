import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const widths: Record<string, number> = body?.widths || { A: 18, B: 12 }

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()
    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)

    for (const [col, width] of Object.entries(widths)) {
      const idx = col.toUpperCase().split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0)
      const colObj = ws.getColumn(idx)
      colObj.width = width
    }

    const { url } = await saveWorkbook(wb, `col-widths-${sheetName}`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
