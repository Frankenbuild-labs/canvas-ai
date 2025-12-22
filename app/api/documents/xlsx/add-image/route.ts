import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import ExcelJS from "exceljs"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

async function loadPublicBytes(publicUrl: string) {
  const rel = publicUrl.replace(/^\/+/, "")
  const p = path.join(process.cwd(), "public", rel)
  return fs.readFile(p)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const imageUrl: string = body?.imageUrl || "/placeholder.png"
    const tl: string = body?.cell || "A1" // top-left cell position for image
    const width: number = Number(body?.width || 200)
    const height: number = Number(body?.height || 80)

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()
    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)

    const bytes = await loadPublicBytes(imageUrl)
    const ext = path.extname(imageUrl).toLowerCase().replace('.', '') as any
    // Prefer base64 input to avoid Buffer typing incompatibilities
    const base64 = Buffer.isBuffer(bytes) ? bytes.toString('base64') : Buffer.from(bytes as any).toString('base64')
    const imgId = wb.addImage({ base64, extension: (ext === 'jpg' ? 'jpeg' : ext) || 'png' })
    ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width, height } })

    const { url } = await saveWorkbook(wb, `add-image-${sheetName}`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
