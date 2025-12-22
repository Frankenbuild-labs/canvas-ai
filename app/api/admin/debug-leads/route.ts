import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import sql from '@/lib/database'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (id) {
      const lead = await sql`SELECT * FROM crm_leads WHERE id = ${id} LIMIT 1`
      return NextResponse.json({ lead: lead[0] || null })
    }
    
    const leads = await sql`SELECT * FROM crm_leads ORDER BY created_at DESC LIMIT 5`
    return NextResponse.json({ leads, count: leads.length })
  } catch (e: any) {
    console.error('[DEBUG-LEADS]', e)
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = randomUUID()
    
    const result = await sql`
      INSERT INTO crm_leads (id, user_id, name, email, phone, company, position, status, value, source, notes, created_at, updated_at, last_contact, document_id, document_answers)
      VALUES (
        ${id},
        ${'test-user'},
        ${body.name || 'Test Name'},
        ${body.email || 'test@test.com'},
        ${body.phone || null},
        ${body.company || 'Test Company'},
        ${body.position || null},
        ${body.status || 'new'},
        ${Number(body.value || 0)},
        ${body.source || null},
        ${body.notes || null},
        NOW(),
        NOW(),
        ${body.lastContact || null},
        ${body.documentId || null},
        ${body.docAnswers || null}
      )
      RETURNING *
    `
    
    return NextResponse.json({ success: true, lead: result[0] })
  } catch (e: any) {
    console.error('[DEBUG-LEADS POST]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const testUserId = '11111111-1111-1111-1111-111111111111'
    
    // Update all contacts to have the test user_id
    await sql`UPDATE contacts SET user_id = ${testUserId} WHERE user_id IS NULL OR user_id != ${testUserId}`
    
    // Count contacts after update
    const count = await sql`SELECT COUNT(*)::int as count FROM contacts WHERE user_id = ${testUserId}`
    
    return NextResponse.json({ 
      success: true,
      userId: testUserId,
      totalContactsForUser: count[0]?.count || 0
    })
  } catch (e: any) {
    console.error('[DEBUG-LEADS PUT]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
