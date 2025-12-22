import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    const leadId = String(form.get('leadId') || '')
    if (!file || !leadId) return NextResponse.json({ error: 'missing-file-or-leadId' }, { status: 400 })
    const array = await file.arrayBuffer()
    const buffer = Buffer.from(array)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const dir = path.join(process.cwd(), 'public', 'uploads', 'leads', leadId)
    await fs.mkdir(dir, { recursive: true })
    const filename = `${Date.now()}_${safeName}`
    const full = path.join(dir, filename)
    await fs.writeFile(full, buffer)
    const url = `/uploads/leads/${encodeURIComponent(leadId)}/${encodeURIComponent(filename)}`
    return NextResponse.json({ ok: true, url, name: file.name })
  } catch (e: any) {
    console.error('Attachment upload failed:', e)
    return NextResponse.json({ error: 'upload-failed' }, { status: 500 })
  }
}
