import { NextRequest, NextResponse } from 'next/server'
import { updateSurvey, deleteSurvey } from '@/lib/crm-supabase'
import { getUserIdFromRequest } from '@/lib/auth-next'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const id = params.id
    const body = await req.json()
    const patch: any = {}
    if (body.name !== undefined) patch.name = String(body.name)
    if (body.description !== undefined) patch.description = body.description ? String(body.description) : null
    if (body.schema !== undefined) patch.schema = body.schema
    const updated = await updateSurvey(userId, id, patch)
    if (!updated) return NextResponse.json({ error: 'Not found or no changes' }, { status: 404 })
    return NextResponse.json({ survey: updated })
  } catch (e: any) {
    console.error('Surveys PATCH failed:', e)
    return NextResponse.json({ error: 'Failed to update survey' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromRequest(_req as any)
    const id = params.id
    await deleteSurvey(userId, id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Surveys DELETE failed:', e)
    return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 })
  }
}
