#!/usr/bin/env node
/**
 * OnlyOffice Document Server startup verification script.
 * Polls the container until the API script is reachable or timeout occurs.
 */

const MAX_WAIT_MS = 180000 // 3 minutes
const POLL_INTERVAL_MS = 5000 // 5 seconds

const baseUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_DOCSERVER_URL || 'http://127.0.0.1:8082'
const scriptUrl = `${baseUrl.replace(/\/$/, '')}/web-apps/apps/api/documents/api.js`
const healthUrl = `${baseUrl.replace(/\/$/, '')}/healthcheck`

console.log(`[OnlyOffice Check] Waiting for Document Server at ${baseUrl}...`)
console.log(`[OnlyOffice Check] Script: ${scriptUrl}`)
console.log(`[OnlyOffice Check] Health: ${healthUrl}`)
console.log(`[OnlyOffice Check] Max wait: ${MAX_WAIT_MS / 1000}s\n`)

const startTime = Date.now()

async function checkEndpoint(url, label) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
    return { ok: resp.ok, status: resp.status }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function poll() {
  const elapsed = Date.now() - startTime
  if (elapsed > MAX_WAIT_MS) {
    console.error(`\n❌ Timeout after ${Math.round(elapsed / 1000)}s. Document Server did not become ready.`)
    console.error(`\nTroubleshooting:`)
    console.error(`1. Check logs: docker logs onlyoffice-docserver --tail 200`)
    console.error(`2. Restart container: docker compose down onlyoffice && docker compose up -d onlyoffice`)
    console.error(`3. Check port binding: netstat -ano | findstr :8082`)
    console.error(`4. Verify Docker Desktop is running and healthy`)
    process.exit(1)
  }

  const health = await checkEndpoint(healthUrl, 'Health')
  const script = await checkEndpoint(scriptUrl, 'Script')

  const elapsedSec = Math.round(elapsed / 1000)
  process.stdout.write(`\r[${elapsedSec}s] Health: ${health.status || health.error} | Script: ${script.status || script.error}`)

  if (health.ok && script.ok) {
    console.log(`\n\n✅ Document Server is ready! (${elapsedSec}s)`)
    console.log(`   Health: ${health.status}`)
    console.log(`   Script: ${script.status}`)
    console.log(`\nYou can now use the Documents panel.`)
    process.exit(0)
  }

  setTimeout(poll, POLL_INTERVAL_MS)
}

poll()
