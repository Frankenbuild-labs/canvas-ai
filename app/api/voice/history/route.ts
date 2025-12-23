import { NextRequest, NextResponse } from 'next/server'
import { listCallHistoryWithDispositions, listFollowUps } from '@/lib/voice/calls-db'
import { getUserIdFromRequest } from '@/lib/auth-next'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = await getUserIdFromRequest(req as any)
    const type = searchParams.get('type') || 'history' // 'history' or 'followups'
    const limit = parseInt(searchParams.get('limit') || '50')

    if (type === 'followups') {
      const followUps = await listFollowUps(userId, 7)
      return NextResponse.json({ followUps })
    }

    const calls = await listCallHistoryWithDispositions(userId, limit)
    return NextResponse.json({ calls })
  } catch (error) {
    console.error('Error fetching call history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call history' },
      { status: 500 }
    )
  }
}
