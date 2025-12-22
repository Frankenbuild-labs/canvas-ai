import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const find: string = body?.find || ""
    const replaceWith: string = body?.replaceWith || ""
    if (!find) return NextResponse.json({ error: "missing 'find'" }, { status: 400 })

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()
    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)

    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const v = cell.value
        if (typeof v === "string" && v.includes(find)) {
          cell.value = v.split(find).join(replaceWith)
        }
      })
    })

    const { url } = await saveWorkbook(wb, `find-replace-${sheetName}`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
