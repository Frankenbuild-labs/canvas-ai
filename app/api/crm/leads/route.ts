import { NextRequest, NextResponse } from 'next/server'
// Prevent Next from attempting to statically prerender this route at build time
export const dynamic = 'force-dynamic'
import { DatabaseService } from '@/lib/database'
import { listLeads, insertLeads, updateLead } from '@/lib/crm-supabase'
import sql from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const list_id = searchParams.get('list_id') || undefined
    const limit = Number(searchParams.get('limit') || '100')
    const skip = Number(searchParams.get('skip') || '0')

    const { leads, total } = await listLeads(userId, { search, listId: list_id, limit, skip })
    return NextResponse.json({ leads, total })
  } catch (e: any) {
    console.error('List CRM leads failed:', e)
    return NextResponse.json({ error: 'Failed to list leads', details: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const body = await request.json()
    console.log('[CRM POST] Received body:', JSON.stringify(body, null, 2))
    const item = {
      name: String(body.name || ''),
      email: String(body.email || ''),
      phone: body.phone ? String(body.phone) : undefined,
      company: String(body.company || ''),
      position: body.position ? String(body.position) : undefined,
      status: String(body.status || 'new'),
      value: Number(body.value || 0),
      source: body.source ? String(body.source) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      last_contact: body.lastContact ? String(body.lastContact) : undefined,
      document_id: body.documentId ? String(body.documentId) : undefined,
      document_answers: body.docAnswers ?? undefined,
    }
    console.log('[CRM POST] Mapped item:', JSON.stringify(item, null, 2))
    if (!item.name || !item.email || !item.company) {
      return NextResponse.json({ error: 'name, email, and company are required' }, { status: 400 })
    }
    const created = await insertLeads(userId, [item as any])
    console.log('[CRM POST] Created lead:', JSON.stringify(created[0], null, 2))
    return NextResponse.json({ lead: created[0] })
  } catch (e: any) {
    console.error('Create CRM lead failed:', e)
    return NextResponse.json({ error: 'Failed to create lead', details: e.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const body = await request.json()
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const patch: any = {}
    if (body.name !== undefined) patch.name = String(body.name)
    if (body.email !== undefined) patch.email = String(body.email)
    if (body.phone !== undefined) patch.phone = body.phone ? String(body.phone) : null
    if (body.company !== undefined) patch.company = String(body.company)
    if (body.position !== undefined) patch.position = body.position ? String(body.position) : null
    if (body.status !== undefined) patch.status = String(body.status)
    if (body.value !== undefined) patch.value = Number(body.value)
    if (body.source !== undefined) patch.source = body.source ? String(body.source) : null
    if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes) : null
    if (body.lastContact !== undefined) patch.last_contact = body.lastContact ? String(body.lastContact) : null
    if (body.documentId !== undefined) patch.document_id = body.documentId ? String(body.documentId) : null
    if (body.docAnswers !== undefined) patch.document_answers = body.docAnswers
    const updated = await updateLead(userId, id, patch)
    if (!updated) return NextResponse.json({ error: 'Not found or no changes' }, { status: 404 })
    return NextResponse.json({ lead: updated })
  } catch (e: any) {
    console.error('Update CRM lead failed:', e)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const { searchParams } = new URL(request.url)
    
    // Special operation: fix all contact user_ids
    if (searchParams.get('operation') === 'fix_userids') {
      await sql`UPDATE crm_leads SET user_id = ${userId} WHERE user_id IS NULL OR user_id != ${userId}`
      const count = await sql`SELECT COUNT(*)::int as count FROM crm_leads WHERE user_id = ${userId}`
      return NextResponse.json({ success: true, operation: 'fix_userids', totalContacts: count[0]?.count || 0 })
    }
    
    // Delete single lead
    const id = searchParams.get('id')
    if (id) {
      const { deleteLead } = await import('@/lib/crm-supabase')
      const success = await deleteLead(userId, id)
      if (!success) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
  } catch (e: any) {
    console.error('DELETE operation failed:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
