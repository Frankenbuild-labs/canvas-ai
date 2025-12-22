import { NextRequest, NextResponse } from 'next/server'
import { createCallLog } from '@/lib/voice/calls-db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, leadId, contactNumber, fromNumber, providerCallSid, direction, status } = body

    if (!userId || !contactNumber || !fromNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, contactNumber, fromNumber' },
        { status: 400 }
      )
    }

    const callLog = await createCallLog({
      userId,
      leadId,
      contactNumber,
      fromNumber,
      providerCallSid,
      direction: direction || 'outbound',
      status,
    })

    return NextResponse.json({ success: true, callLog })
  } catch (error) {
    console.error('Error creating call log:', error)
    return NextResponse.json(
      { error: 'Failed to create call log' },
      { status: 500 }
    )
  }
}
