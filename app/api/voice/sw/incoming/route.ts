// app/api/voice/sw/incoming/route.ts
// Default webhook handler for incoming calls (when no agent is assigned)

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Get call details from SignalWire
    const formData = await req.formData()
    const from = formData.get('From') || ''
    const to = formData.get('To') || ''
    const callSid = formData.get('CallSid') || ''
    
    console.log(`📞 Incoming call from ${from} to ${to} (${callSid})`)
    
    // Return SWML to answer the call
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Thank you for calling. This number is not yet configured. Please contact support.</Say>
  <Pause length="1"/>
  <Hangup/>
</Response>`
    
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml' }
    })
  } catch (error: any) {
    console.error('Error handling incoming call:', error)
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred. Please try again later.</Say>
  <Hangup/>
</Response>`
    
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml' }
    })
  }
}

// Handle GET for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Incoming call webhook endpoint',
    usage: 'Configure this URL in your SignalWire number settings',
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/voice/sw/incoming`
  })
}
