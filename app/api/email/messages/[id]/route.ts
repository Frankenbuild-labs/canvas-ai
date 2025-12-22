import { NextRequest, NextResponse } from 'next/server'
import { EmailDB } from '@/lib/email-db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const msg = await EmailDB.getById(params.id)
    if (!msg) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 })
    return NextResponse.json({ ok: true, message: msg })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'message-error' }, { status: 500 })
  }
}
