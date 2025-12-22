import { promises as fs } from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const DIR = path.join(process.cwd(), "data", "crm")
const FILE = path.join(DIR, "leads.jsonl")

async function ensureDir() {
  await fs.mkdir(DIR, { recursive: true }).catch(() => {})
}

export type LeadLike = {
  id?: string
  name: string
  email: string
  phone?: string
  company: string
  position?: string
  status?: string
  value?: number
  source?: string
  notes?: string
  created_at?: string
  last_contact?: string
}

export async function fileAppendLeads(items: LeadLike[]): Promise<LeadLike[]> {
  // Disallow file fallback when running in strict production mode unless explicitly enabled
  const allow = process.env.CRM_ALLOW_FILE_FALLBACK === 'true'
  if (!allow) throw new Error('File fallback disabled in production')
  await ensureDir()
  const out: LeadLike[] = []
  for (const it of items) {
    const rec: LeadLike = {
      id: it.id || uuidv4(),
      name: it.name,
      email: it.email,
      phone: it.phone,
      company: it.company,
      position: it.position,
      status: it.status || "new",
      value: Number(it.value || 0),
      source: it.source,
      notes: it.notes,
      created_at: it.created_at || new Date().toISOString(),
      last_contact: it.last_contact,
    }
    await fs.appendFile(FILE, JSON.stringify(rec) + "\n", "utf-8")
    out.push(rec)
  }
  return out
}

export async function fileListLeads(options?: { limit?: number; skip?: number; search?: string }) {
  // Disallow file fallback when running in strict production mode unless explicitly enabled
  const allow = process.env.CRM_ALLOW_FILE_FALLBACK === 'true'
  if (!allow) throw new Error('File fallback disabled in production')
  try {
    const raw = await fs.readFile(FILE, "utf-8")
    const rows = raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l)) as LeadLike[]
    const search = (options?.search || "").toLowerCase().trim()
    let arr = rows
    if (search) {
      arr = arr.filter((r) =>
        [r.name, r.email, r.phone, r.company].some((f) => (f || "").toLowerCase().includes(search))
      )
    }
    arr.sort((a, b) => (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()))
    const skip = Math.max(0, options?.skip || 0)
    const limit = Math.max(1, Math.min(200, options?.limit || 100))
    const page = arr.slice(skip, skip + limit)
    return { leads: page, total: arr.length }
  } catch (e: any) {
    return { leads: [], total: 0 }
  }
}
