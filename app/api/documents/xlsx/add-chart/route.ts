import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import * as PImage from "pureimage"
import { loadLatestWorkbook, saveWorkbook } from "../_utils"

function drawBarChart(data: number[], width = 600, height = 300) {
  const img = PImage.make(width, height)
  const ctx = img.getContext('2d') as any
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0,0,width,height)
  const max = Math.max(1, ...data)
  const margin = 20
  const w = width - margin*2
  const h = height - margin*2
  const barW = w / data.length
  ctx.fillStyle = '#1e88e5'
  data.forEach((v, i) => {
    const bh = Math.round((v/max) * h)
    const x = margin + i * barW + 8
    const y = height - margin - bh
    ctx.fillRect(x, y, Math.max(6, barW - 16), bh)
  })
  return img
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sheetName: string = body?.sheet || "Sheet1"
    const values: number[] = Array.isArray(body?.values) ? body.values.map((n: any) => Number(n) || 0) : [5,12,8,15,9]
    const width: number = Number(body?.width || 600)
    const height: number = Number(body?.height || 300)

    let { wb } = await loadLatestWorkbook()
    if (!wb) wb = new ExcelJS.Workbook()
    let ws = wb.getWorksheet(sheetName) || wb.addWorksheet(sheetName)

    const img = drawBarChart(values, width, height)
    const { PassThrough } = require('stream');
    const outstream = new PassThrough();
    const bufPromise = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      outstream.on('data', (d: Buffer) => chunks.push(d));
      outstream.on('end', () => resolve(Buffer.concat(chunks)));
      outstream.on('error', reject);
    });
    await PImage.encodePNGToStream(img, outstream);
    const buf = await bufPromise;
    // Use base64 to avoid Buffer typing mismatch with exceljs types
    const base64 = Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf as any).toString('base64')
    const imgId = wb.addImage({ base64, extension: 'png' })
    ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width, height } })

    const { url } = await saveWorkbook(wb, `add-chart-${sheetName}`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 })
  }
}
