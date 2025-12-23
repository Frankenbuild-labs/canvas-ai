import { NextRequest, NextResponse } from 'next/server'
import { listCustomSources, addCustomSource, removeCustomSource } from '@/lib/crm-supabase'
import { getUserIdFromRequest } from '@/lib/auth-next'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const sources = await listCustomSources(userId)
    return NextResponse.json({ sources })
  } catch (e: any) {
    console.error('Custom sources GET failed:', e)
    return NextResponse.json({ sources: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const { source } = await req.json()
    if (!source || typeof source !== 'string') {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }
    await addCustomSource(userId, source.trim())
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Custom sources POST failed:', e)
    return NextResponse.json({ error: 'Failed to add source' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const { searchParams } = new URL(req.url)
    const source = searchParams.get('source')
    if (!source) {
      return NextResponse.json({ error: 'Missing source' }, { status: 400 })
    }
    await removeCustomSource(userId, source)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Custom sources DELETE failed:', e)
    return NextResponse.json({ error: 'Failed to remove source' }, { status: 500 })
  }
}
