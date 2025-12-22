import { promises as fs } from "fs"
import path from "path"

const REGISTRY_PATH = path.join(process.cwd(), "uploads", "doc-registry.json")

export type DocEntry = {
  id: string
  url: string
  kind: "docx" | "xlsx" | "pdf" | "pptx"
  title?: string
  createdAt: string
}

export async function addToRegistry(entry: DocEntry) {
  const list = await readRegistry()
  list.unshift(entry)
  const dedup = dedupe(list)
  await fs.mkdir(path.dirname(REGISTRY_PATH), { recursive: true })
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(dedup, null, 2), "utf8")
}

export async function readRegistry(): Promise<DocEntry[]> {
  const raw = await fs.readFile(REGISTRY_PATH, "utf8").catch(() => "[]")
  try { return JSON.parse(raw) as DocEntry[] } catch { return [] }
}

export function findLatestByKind(list: DocEntry[], kind: DocEntry["kind"]) {
  return list.find(e => e.kind === kind) || null
}

function dedupe(list: DocEntry[]) {
  const seen = new Set<string>()
  const out: DocEntry[] = []
  for (const e of list) {
    const key = `${e.kind}:${e.url}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out.slice(0, 100)
}
