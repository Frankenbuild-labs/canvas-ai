import { NextRequest, NextResponse } from 'next/server'
import { addCallDisposition, getCallDisposition } from '@/lib/voice/calls-db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { callLogId, dispositionType, notes, nextAction, followUpDate, userId } = body

    if (!callLogId || !dispositionType || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: callLogId, dispositionType, userId' },
        { status: 400 }
      )
    }

    const disposition = await addCallDisposition(callLogId, {
      dispositionType,
      notes,
      nextAction,
      followUpDate,
      createdBy: userId,
    })

    return NextResponse.json({ success: true, disposition })
  } catch (error) {
    console.error('Error adding call disposition:', error)
    return NextResponse.json(
      { error: 'Failed to add call disposition' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const callLogId = searchParams.get('callLogId')

    if (!callLogId) {
      return NextResponse.json(
        { error: 'Missing callLogId parameter' },
        { status: 400 }
      )
    }

    const disposition = await getCallDisposition(callLogId)
    return NextResponse.json({ disposition })
  } catch (error) {
    console.error('Error fetching call disposition:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call disposition' },
      { status: 500 }
    )
  }
}
