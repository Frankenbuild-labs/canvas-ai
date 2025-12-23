import { NextRequest, NextResponse } from 'next/server'
import { createCallLog } from '@/lib/voice/calls-db'
import { getUserIdFromRequest } from '@/lib/auth-next'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leadId, contactNumber, fromNumber, providerCallSid, direction, status } = body

    if (!contactNumber || !fromNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: contactNumber, fromNumber' },
        { status: 400 }
      )
    }

    const userId = await getUserIdFromRequest(req as any)

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
