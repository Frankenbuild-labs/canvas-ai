import { NextRequest, NextResponse } from 'next/server'
import { EmailDB } from '@/lib/email-db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') || '25')
    const offset = Number(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || undefined
    const rows = await EmailDB.listOutbox({ limit, offset, search })
    return NextResponse.json({ ok: true, items: rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'outbox-error' }, { status: 500 })
  }
}
