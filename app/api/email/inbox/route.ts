import { NextRequest, NextResponse } from 'next/server'
import { EmailDB } from '@/lib/email-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') || '25')
    const offset = Number(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || undefined
    const items = await EmailDB.listInbox({ limit, offset, search })
    return NextResponse.json({ ok: true, items })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'inbox-error' }, { status: 500 })
  }
}
