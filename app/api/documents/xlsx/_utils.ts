import path from "path"
import { promises as fs } from "fs"
import ExcelJS from "exceljs"
import { readRegistry, findLatestByKind, addToRegistry } from "@/lib/documents/registry"

export async function loadLatestWorkbook() {
  const list = await readRegistry()
  const latest = findLatestByKind(list, "xlsx")
  if (!latest?.url) return { wb: null as ExcelJS.Workbook | null, url: null as string | null }
  const rel = latest.url.replace(/^\/+/, "")
  const filePath = path.join(process.cwd(), "public", rel)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  return { wb, url: latest.url }
}

export async function saveWorkbook(wb: ExcelJS.Workbook, title: string) {
  const outDir = path.join(process.cwd(), "public", "generated")
  await fs.mkdir(outDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `${title}-${ts}.xlsx`
  const dest = path.join(outDir, filename)
  const ab = (await wb.xlsx.writeBuffer()) as ArrayBuffer
  await fs.writeFile(dest, Buffer.from(ab))
  const url = `/generated/${encodeURIComponent(filename)}`
  await addToRegistry({ id: filename, url, kind: "xlsx", title, createdAt: new Date().toISOString() })
  return { url }
}
