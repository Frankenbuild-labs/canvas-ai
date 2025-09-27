import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

async function readConfig() {
  try {
    const p = path.join(process.cwd(), '.next', 'cache', 'roo-config.json')
    const raw = await fs.readFile(p, 'utf8').catch(() => '')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export async function GET() {
  const sidecarBaseRaw = process.env.ROO_SIDECAR_URL || ''
  const sidecarBase = sidecarBaseRaw.replace(/\/$/, '')
  const startedAt = Date.now()
  let reachable = false
  let upstreamStatus: number | undefined
  let taskProbe: { ok: boolean; status?: number; error?: string } | null = null
  try {
    if (sidecarBase) {
      const res = await fetch(sidecarBase)
      upstreamStatus = res.status
      reachable = true
      // Task probe
      try {
        const t = await fetch(`${sidecarBase}/roo/task`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({ text: 'health probe', extensionId: 'rooveterinaryinc.roo-cline' }),
        })
        taskProbe = { ok: t.ok, status: t.status }
        if (t.body) {
          // consume one chunk to verify streaming then abort
          const reader = t.body.getReader(); await reader.read(); reader.cancel().catch(()=>{})
        }
      } catch (e: any) {
        taskProbe = { ok: false, error: e?.message || 'task probe error' }
      }
    }
  } catch (e) {
    reachable = false
  }
  const cfg = await readConfig()
  const durationMs = Date.now() - startedAt
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    durationMs,
    sidecarConfigured: !!sidecarBase,
    sidecarBase,
    reachable,
    upstreamStatus,
    taskProbe,
    config: cfg,
  })
}
