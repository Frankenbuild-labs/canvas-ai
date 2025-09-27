import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Simple file-backed config persistence (not for multi-instance clustering)
// Fields: model, temperature (string), autoApprove (boolean)
// Location: .next/cache/roo-config.json (ephemeral in production unless volume persisted)

interface RooConfig {
  model: string
  temperature: string
  autoApprove: boolean
  updatedAt: string
}

const DEFAULT_CONFIG: RooConfig = {
  model: 'default',
  temperature: '0.2',
  autoApprove: false,
  updatedAt: new Date().toISOString(),
}

function getConfigPath() {
  // Use project root relative path; storing inside .next/cache to avoid accidental commits
  return path.join(process.cwd(), '.next', 'cache', 'roo-config.json')
}

async function readConfig(): Promise<RooConfig> {
  const p = getConfigPath()
  try {
    const raw = await fs.readFile(p, 'utf8')
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_CONFIG
  }
}

async function writeConfig(cfg: Partial<RooConfig>): Promise<RooConfig> {
  const merged: RooConfig = { ...(await readConfig()), ...cfg, updatedAt: new Date().toISOString() }
  const p = getConfigPath()
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(merged, null, 2), 'utf8')
  return merged
}

export async function GET() {
  const cfg = await readConfig()
  return NextResponse.json(cfg)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { model, temperature, autoApprove } = body || {}
    const partial: Partial<RooConfig> = {}
    if (typeof model === 'string') partial.model = model
    if (typeof temperature === 'string') partial.temperature = temperature
    if (typeof autoApprove === 'boolean') partial.autoApprove = autoApprove
    const cfg = await writeConfig(partial)
    return NextResponse.json(cfg)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed to update config' }, { status: 500 })
  }
}
