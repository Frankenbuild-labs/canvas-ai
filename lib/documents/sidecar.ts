import { promises as fs } from "fs"
import path from "path"

export function getSidecarPathFor(filePath: string) {
  const dir = path.dirname(filePath)
  const base = path.basename(filePath, path.extname(filePath))
  return path.join(dir, `${base}.json`)
}

export async function writeSidecar(filePath: string, data: any) {
  const sidecarPath = getSidecarPathFor(filePath)
  await fs.writeFile(sidecarPath, JSON.stringify(data, null, 2), "utf8")
  return sidecarPath
}

export async function readSidecar(filePath: string) {
  const sidecarPath = getSidecarPathFor(filePath)
  const raw = await fs.readFile(sidecarPath, "utf8").catch(() => null)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}
