import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const rows: any[][] = Array.isArray(body?.rows) ? body.rows : []

    if (!rows.length) return NextResponse.json({ error: "missing 'rows'" }, { status: 400 })

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()
    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)

    for (const r of rows) ws.addRow(r)

    const { url } = await saveWorkbook(wb, `append-rows-${sheetName}`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
