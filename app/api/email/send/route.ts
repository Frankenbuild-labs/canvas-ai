import { NextRequest, NextResponse } from 'next/server'
import { EmailDB } from '@/lib/email-db'

type AttachmentInput = { filename: string; mime?: string; contentBase64: string }
interface SendPayload { from: string; to: string[]; subject?: string; text?: string; html?: string; attachments?: AttachmentInput[] }

async function sendViaResend(payload: SendPayload) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'no-resend-key' }
  try {
    const attachments = Array.isArray(payload.attachments) && payload.attachments.length > 0
      ? payload.attachments.map(a => ({ filename: a.filename, content: a.contentBase64 }))
      : undefined
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: payload.from,
  to: payload.to,
        subject: payload.subject || '',
        text: payload.text || undefined,
        html: payload.html || undefined,
        attachments
      })
    })
    if (!res.ok) {
      const t = await res.text()
      return { ok: false, error: `resend-${res.status}`, detail: t }
    }
    const json = await res.json()
    return { ok: true, id: json?.id }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'resend-error' }
  }
}

import path from 'path'
import { promises as fs } from 'fs'
async function appendLocalSent(rec: any) {
  const dir = path.join(process.cwd(), 'data', 'email')
  const file = path.join(dir, 'sent.jsonl')
  await fs.mkdir(dir, { recursive: true }).catch(()=>{})
  await fs.appendFile(file, JSON.stringify({ ...rec, id: rec.id || `${Date.now()}` }) + '\n', 'utf-8')
}

export async function POST(request: NextRequest) {
  try {
  const body = await request.json()
  const from = String(body.from || '')
  const toRaw = body.to
  const toList = Array.isArray(toRaw) ? toRaw.map((v: any)=>String(v||'').trim()).filter(Boolean) : [String(toRaw||'').trim()]
    const subject = String(body.subject || '')
    const text = body.text ? String(body.text) : undefined
    const html = body.html ? String(body.html) : undefined
    const attachmentsRaw: any[] = Array.isArray(body.attachments) ? body.attachments : []
    const attachments: AttachmentInput[] = attachmentsRaw.filter(a => a && a.filename && a.contentBase64).map(a => ({ filename: String(a.filename), mime: a.mime ? String(a.mime) : undefined, contentBase64: String(a.contentBase64) }))
  if (!from || !toList.length) return NextResponse.json({ error: 'from-to-required' }, { status: 400 })

    // Basic size guard: skip sending attachments if combined > 15MB (provider limit safety)
    const totalSizeBytes = attachments.reduce((acc, a) => acc + (Buffer.from(a.contentBase64, 'base64').length || 0), 0)
    const oversized = totalSizeBytes > 15 * 1024 * 1024
    if (oversized) {
      return NextResponse.json({ error: 'attachments-too-large', maxMB: 15 }, { status: 400 })
    }

    // Try Resend first
  const res = await sendViaResend({ from, to: toList, subject, text, html, attachments })
    // Persist to DB (best-effort)
    try {
      const attachmentsMeta = attachments.map(a => ({ filename: a.filename, mime: a.mime, size_bytes: Buffer.from(a.contentBase64, 'base64').length }))
      const record = await EmailDB.insertOutbound({
        user_id: null,
  from,
  to: toList.join(', '),
        subject,
        text,
        html,
        attachments: attachmentsMeta,
        provider: res.ok ? 'resend' : 'local',
        provider_id: res.ok ? String(res.id) : null,
        status: res.ok ? 'sent' : 'queued',
        error: res.ok ? null : (res as any)?.error || null,
      })
      // Also append local log for visibility
  await appendLocalSent({ id: record.id, from, to: toList, subject, text, html, attachments: attachmentsMeta, date: new Date().toISOString(), provider: res.ok ? 'resend' : 'local' })
      if (res.ok) return NextResponse.json({ ok: true, id: record.id, provider_id: res.id })
    } catch {
      // Fallback to local log only
  await appendLocalSent({ from, to: toList, subject, text, html, attachments: attachments.map(a=>({ filename: a.filename, mime: a.mime })), date: new Date().toISOString(), provider: res.ok ? 'resend' : 'local' })
      if (res.ok) return NextResponse.json({ ok: true, id: res.id })
    }
    // If Resend unavailable, return success for local-only
    return NextResponse.json({ ok: true, id: `local-${Date.now()}`, provider: 'local' })
  } catch (e: any) {
    return NextResponse.json({ error: 'send-failed' }, { status: 500 })
  }
}
