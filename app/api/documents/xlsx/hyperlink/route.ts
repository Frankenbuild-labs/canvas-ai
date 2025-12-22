import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const address: string = body?.address || "A1"
    const url: string = body?.url || "https://example.com"
    const text: string = body?.text || url
    const tooltip: string | undefined = body?.tooltip

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()
    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)

    ws.getCell(address).value = { text, hyperlink: url, tooltip }

    const { url: outUrl } = await saveWorkbook(wb, `hyperlink-${sheetName}-${address}`)
    return NextResponse.json({ url: outUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
