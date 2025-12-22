import { describe, it, expect } from 'vitest'

// NOTE: These tests assume the dev server is running on NEXT_PUBLIC_BASE_URL
// and the Python agents service is running at AGENTS_SERVICE_URL.
// They perform basic HTTP checks; for full E2E, spin up both services.

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'

async function j(method: string, path: string, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { res, data }
}

describe('Voice Integration Basic', () => {
  it('lists numbers', async () => {
    const { res, data } = await j('GET', '/api/voice/sw/numbers')
    expect(res.status).toBeLessThan(500)
    expect(data).toBeTruthy()
  })

  it('fails call with missing fields', async () => {
    const { res, data } = await j('POST', '/api/voice/sw/call', { to: '', fromNumber: '', userDeviceNumber: '' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(data.ok).toBe(false)
  })

  it('sms validation missing fields', async () => {
    const { res, data } = await j('POST', '/api/voice/sw/sms', { from: '', to: '', text: '' })
    expect(res.status).toBe(400)
    expect(data.ok).toBe(false)
  })
})
