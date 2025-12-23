import { NextRequest, NextResponse } from 'next/server'
import { listRecentCalls } from '@/lib/voice/calls-db'
import { getUserIdFromRequest } from '@/lib/auth-next'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(_req as any)
    const calls = await listRecentCalls(userId, 20)
    return NextResponse.json({ ok: true, calls })
  } catch (e: any) {
    console.error('Error fetching recent calls:', e)
    // Don't break the dialer UI if auth or tables are not fully configured yet
    return NextResponse.json({ ok: true, calls: [], error: e?.message || 'error' }, { status: 200 })
  }
}
