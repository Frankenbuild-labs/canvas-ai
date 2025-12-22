import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { listRecentCalls } from '@/lib/voice/calls-db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const calls = await listRecentCalls(userId, 20)
    return NextResponse.json({ ok: true, calls })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}
