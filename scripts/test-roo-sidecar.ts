#!/usr/bin/env ts-node
/**
 * Diagnostic script to verify Roo sidecar availability and basic task lifecycle.
 *
 * Usage (from repo root):
 *   npx ts-node scripts/test-roo-sidecar.ts
 * or if ts-node installed globally: ts-node scripts/test-roo-sidecar.ts
 *
 * Environment:
 *   ROO_SIDECAR_URL must be set (e.g. http://localhost:23333/api/v1)
 */
import readline from 'node:readline'

interface Result {
  ok: boolean
  message: string
  details?: any
}

const SIDE = (process.env.ROO_SIDECAR_URL || '').replace(/\/$/, '')

async function main() {
  const results: { step: string; result: Result }[] = []

  if (!SIDE) {
    logFail('env', 'ROO_SIDECAR_URL not set')
    summarize(results)
    process.exit(1)
  }
  results.push({ step: 'env', result: ok(`Using sidecar base ${SIDE}`) })

  // 1. Base reachability (GET)
  try {
    const res = await fetch(SIDE)
    results.push({ step: 'base-get', result: ok(`HTTP ${res.status} received (reachability confirmed)`) })
  } catch (e: any) {
    results.push({ step: 'base-get', result: fail(`Network error: ${e?.message || e}`) })
  }

  // 2. Task create (POST /roo/task) streaming minimal
  let taskId: string | undefined
  try {
    const createRes = await fetch(`${SIDE}/roo/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ text: 'diagnostic: quick test', extensionId: 'rooveterinaryinc.roo-cline' }),
    })
    if (!createRes.body) throw new Error('No body on create response')

    const reader = createRes.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let sawMessage = false
    const start = Date.now()

    while (Date.now() - start < 5000) { // read up to 5s then stop
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const chunks = buf.split(/\n\n+/)
      buf = chunks.pop() || ''
      for (const raw of chunks) {
        // SSE parse minimal
        const lines = raw.split(/\n/)
        let event: string | undefined
        let dataLines: string[] = []
        for (const l of lines) {
          if (l.startsWith('event:')) event = l.slice(6).trim()
          else if (l.startsWith('data:')) dataLines.push(l.slice(5).trim())
        }
        const dataStr = dataLines.join('\n')
        try {
          const parsed = JSON.parse(dataStr)
          if (!taskId && parsed.taskId) taskId = parsed.taskId
          if (parsed.text) sawMessage = true
        } catch {}
      }
      if (sawMessage && taskId) break
    }
    reader.cancel().catch(() => {})
    if (taskId) results.push({ step: 'task-create', result: ok(`Task created id=${taskId}`) })
    else results.push({ step: 'task-create', result: fail('Did not capture taskId within time window') })
  } catch (e: any) {
    results.push({ step: 'task-create', result: fail(`Error: ${e?.message || e}`) })
  }

  // 3. Follow-up message if we have a taskId
  if (taskId) {
    try {
      const followRes = await fetch(`${SIDE}/roo/task/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ taskId, text: 'continue' }),
      })
      if (!followRes.body) throw new Error('No body on follow-up response')
      // Just read a first chunk to ensure stream opens
      await followRes.body.getReader().read()
      results.push({ step: 'follow-up', result: ok('Follow-up stream opened') })
    } catch (e: any) {
      results.push({ step: 'follow-up', result: fail(`Error: ${e?.message || e}`) })
    }
  }

  summarize(results)
  const hasFailure = results.some(r => !r.result.ok)
  process.exit(hasFailure ? 2 : 0)
}

function ok(message: string, details?: any): Result { return { ok: true, message, details } }
function fail(message: string, details?: any): Result { return { ok: false, message, details } }
function logFail(step: string, msg: string) { console.error(`[FAIL] ${step} ${msg}`) }

function summarize(list: { step: string; result: Result }[]) {
  console.log('\nRoo Sidecar Diagnostic Summary')
  console.log('--------------------------------')
  for (const { step, result } of list) {
    console.log(`${result.ok ? '✔' : '✖'} ${step}: ${result.message}`)
  }
  console.log('--------------------------------')
  if (list.every(l => l.result.ok)) console.log('All checks passed.')
  else console.log('One or more checks failed. Inspect logs above.')
}

main().catch(e => { console.error(e); process.exit(99) })
