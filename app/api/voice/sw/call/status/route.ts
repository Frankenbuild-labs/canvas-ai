import { NextRequest, NextResponse } from 'next/server'
import { updateCallLogBySid } from '@/lib/voice/calls-db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    const params = new URLSearchParams(text)
    const CallSid = params.get('CallSid') || params.get('CallSid'.toLowerCase()) || ''
    const CallStatus = params.get('CallStatus') || params.get('CallStatus'.toLowerCase()) || ''
    const RecordingUrl = params.get('RecordingUrl') || params.get('RecordingUrl'.toLowerCase()) || ''
    const Duration = params.get('CallDuration') || params.get('Duration') || ''
    const EndTime = params.get('Timestamp') || ''

    if (CallSid) {
      await updateCallLogBySid(CallSid, {
        status: CallStatus || undefined,
        recordingUrl: RecordingUrl || undefined,
        durationSeconds: Duration ? Number(Duration) : undefined,
        endedAt: EndTime || undefined,
        raw: Object.fromEntries(params.entries()),
      })

      // If we have a recording URL, also persist a voicemail entry via the save endpoint
      if (RecordingUrl) {
        const from = params.get('From') || ''
        const to = params.get('To') || ''
        const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'
        // Non-blocking fire-and-forget
        fetch(`${base}/api/voice/sw/voicemail/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: params.get('AgentId') || null,
            callSid: CallSid,
            from,
            to,
            mediaUrl: RecordingUrl,
            duration: Duration ? Number(Duration) : null,
            createdAt: EndTime || new Date().toISOString(),
          }),
        }).catch(() => {})
      }
    }
    // TwiML-style empty response
    return new Response('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } })
  } catch (e: any) {
    // Surface full request body on error for easier debugging (guarded minimal exposure)
    const msg = e?.message || 'status error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
