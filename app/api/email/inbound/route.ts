import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

const DIR = path.join(process.cwd(), 'data', 'email')
const FILE = path.join(DIR, 'inbox.jsonl')

async function appendInbox(m: any) {
  await fs.mkdir(DIR, { recursive: true }).catch(()=>{})
  await fs.appendFile(FILE, JSON.stringify({ id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, ...m }) + '\n', 'utf-8')
}

export async function POST(request: NextRequest) {
  try {
    // Accept generic JSON or form-urlencoded payloads from providers
    const contentType = request.headers.get('content-type') || ''
    let payload: any = {}
    if (contentType.includes('application/json')) {
      payload = await request.json().catch(()=>({}))
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text()
      payload = Object.fromEntries(new URLSearchParams(text))
    } else if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      payload = Object.fromEntries(Array.from(form.entries()))
    }
    const msg = {
      from: String(payload.from || payload.sender || ''),
      to: String(payload.to || payload.recipient || ''),
      subject: String(payload.subject || ''),
      text: payload.text ? String(payload.text) : undefined,
      html: payload.html ? String(payload.html) : undefined,
      date: new Date().toISOString(),
    }
    await appendInbox(msg)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'inbound-failed' }, { status: 500 })
  }
}
