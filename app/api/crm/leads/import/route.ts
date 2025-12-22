import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { insertLeads, listLeads } from '@/lib/crm-db'
import { fileListLeads } from '@/lib/crm-file'

function allowFileFallback() {
  return process.env.CRM_ALLOW_FILE_FALLBACK === 'true'
}

export async function POST(_request: NextRequest) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    // Read file-stored leads
    if (!allowFileFallback()) {
      return NextResponse.json({ ok: false, error: 'file-fallback-disabled' }, { status: 403 })
    }
    const fb = await fileListLeads({ limit: 10000, skip: 0 })
    const items = (fb.leads || []) as Array<any>
    if (!items.length) return NextResponse.json({ ok: true, imported: 0 })

    // If DB already has leads, skip mass import to avoid duplicates
    const { total } = await listLeads(userId, { limit: 1, skip: 0 })
    if (total > 0) return NextResponse.json({ ok: true, imported: 0, reason: 'db-has-leads' })

    const mapped = items.map((r) => ({
      name: String(r.name || ''),
      email: String(r.email || ''),
      phone: r.phone ? String(r.phone) : undefined,
      company: String(r.company || ''),
      position: r.position ? String(r.position) : undefined,
      status: String(r.status || 'new'),
      value: Number(r.value || 0),
      source: r.source ? String(r.source) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      last_contact: r.last_contact ? String(r.last_contact) : undefined,
      document_id: undefined,
      document_answers: undefined,
    }))
    const created = await insertLeads(userId, mapped as any)
    return NextResponse.json({ ok: true, imported: created.length })
  } catch (e: any) {
    console.error('Import file leads to DB failed:', e)
    return NextResponse.json({ ok: false, error: 'import-failed' }, { status: 500 })
  }
}
