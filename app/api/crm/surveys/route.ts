import { NextRequest, NextResponse } from 'next/server'
import { listSurveys, createSurvey } from '@/lib/crm-supabase'
import { getUserIdFromRequest } from '@/lib/auth-next'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const surveys = await listSurveys(userId)
    return NextResponse.json({ surveys })
  } catch (e: any) {
    console.error('Surveys GET failed:', e)
    return NextResponse.json({ surveys: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const body = await req.json()
    const name = String(body.name || '').trim()
    const description = body.description ? String(body.description) : null
    const schema = body.schema ?? null
    if (!name || !schema || !Array.isArray(schema.questions)) {
      return NextResponse.json({ error: 'Invalid survey payload' }, { status: 400 })
    }
    const created = await createSurvey(userId, name, description, { questions: schema.questions })
    return NextResponse.json({ survey: created })
  } catch (e: any) {
    console.error('Surveys POST failed:', e)
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 })
  }
}
