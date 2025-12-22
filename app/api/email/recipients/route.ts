import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { DatabaseService } from '@/lib/database'
import { listListsWithMembers, listLeads } from '@/lib/crm-supabase'

// Returns CRM lists with counts, or members of a specific list
export async function GET(request: NextRequest) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const { searchParams } = new URL(request.url)
    const listId = searchParams.get('list_id') || undefined
    const withMembers = searchParams.get('members') === '1'

    if (listId) {
      // Fetch leads for a single list
      const { leads, total } = await listLeads(userId, { listId, limit: 500 })
      return NextResponse.json({ list_id: listId, total, leads })
    }

    // Otherwise fetch lists with member ids and count only
    const lists = await listListsWithMembers(userId)
    const shaped = lists.map(l => ({ id: l.id, name: l.name, created_at: l.created_at, count: l.leadIds.length, leadIds: withMembers ? l.leadIds : undefined }))
    return NextResponse.json({ lists: shaped })
  } catch (e: any) {
    console.error('Recipients API GET failed:', e)
    return NextResponse.json({ error: 'failed', lists: [] }, { status: 500 })
  }
}
