import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const address: string = body?.address || "A1"
    const value: any = body?.value ?? ""

    let { wb } = await loadLatestWorkbook()
    if (!wb) {
      // create a new workbook if none exists
      wb = new ExcelJS.Workbook()
      wb.addWorksheet(sheetName)
    }

    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)
    ws.getCell(address).value = value

    const { url } = await saveWorkbook(wb, `set-cell-${sheetName}-${address}`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
