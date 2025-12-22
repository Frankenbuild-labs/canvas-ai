import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name: string = body?.name || "Sheet2"
    const headers: string[] = Array.isArray(body?.headers) ? body.headers : []
    const firstRow: any[] = Array.isArray(body?.firstRow) ? body.firstRow : []

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()

    let ws = wb.getWorksheet(name)
    if (!ws) ws = wb.addWorksheet(name)

    if (headers.length) ws.addRow(headers)
    if (firstRow.length) ws.addRow(firstRow)

    const { url } = await saveWorkbook(wb, `add-sheet-${name}`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
