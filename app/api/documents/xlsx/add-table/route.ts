import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const range: string = body?.range || "A1:B2"
    const name: string = body?.name || `Table_${Date.now()}`
  const style: any = body?.style || "TableStyleMedium9"
    const columns: string[] = Array.isArray(body?.columns) ? body.columns : []
    const rows: any[][] = Array.isArray(body?.rows) ? body.rows : []

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()
    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)

    const [from] = range.split(":")
    const colsPayload = (columns.length ? columns : ["Col1", "Col2"]).map((c) => ({ name: String(c) }))
    const rowsPayload = rows.length ? rows : [["", ""]]
    ws.addTable({
      name,
      ref: from,
      headerRow: true,
      totalsRow: false,
      style: { theme: style, showRowStripes: true },
      columns: colsPayload,
      rows: rowsPayload,
    })

    const { url } = await saveWorkbook(wb, `add-table-${sheetName}`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
