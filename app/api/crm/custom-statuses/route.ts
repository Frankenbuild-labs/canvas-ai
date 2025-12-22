import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { listCustomStatuses, addCustomStatus, removeCustomStatus } from '@/lib/crm-supabase'

export async function GET() {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const statuses = await listCustomStatuses(userId)
    return NextResponse.json({ statuses })
  } catch (e: any) {
    console.error('Custom statuses GET failed:', e)
    return NextResponse.json({ statuses: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const { status } = await req.json()
    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    await addCustomStatus(userId, status.trim())
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Custom statuses POST failed:', e)
    return NextResponse.json({ error: 'Failed to add status' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 })
    }
    await removeCustomStatus(userId, status)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Custom statuses DELETE failed:', e)
    return NextResponse.json({ error: 'Failed to remove status' }, { status: 500 })
  }
}
