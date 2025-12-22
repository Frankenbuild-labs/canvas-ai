// app/api/voice/sw/numbers/setup/route.ts
// Setup endpoint to configure SignalWire numbers for incoming calls

import { NextRequest, NextResponse } from 'next/server'

function getAuthHeader() {
  const projectId = process.env.SIGNALWIRE_PROJECT_ID || ''
  const token = process.env.SIGNALWIRE_API_TOKEN || ''
  const auth = Buffer.from(`${projectId}:${token}`).toString('base64')
  return { Authorization: `Basic ${auth}` }
}

function getCompatBase() {
  const space = process.env.SIGNALWIRE_SPACE_NAME || ''
  return `https://${space}/api/laml/2010-04-01/Accounts/${process.env.SIGNALWIRE_PROJECT_ID}`
}

// GET - List all numbers and their current configuration
export async function GET(req: NextRequest) {
  try {
    const listUrl = `${getCompatBase()}/IncomingPhoneNumbers.json?PageSize=100`
    const res = await fetch(listUrl, { 
      headers: { ...getAuthHeader() }, 
      cache: 'no-store' 
    })
    
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ 
        ok: false, 
        error: `SignalWire API error: ${res.status}`,
        details: text 
      }, { status: res.status })
    }
    
    const data = await res.json()
    const numbers = data?.incoming_phone_numbers || data?.IncomingPhoneNumbers || []
    
    // Format the response
    const formatted = numbers.map((num: any) => ({
      phoneNumber: num.phone_number || num.PhoneNumber,
      friendlyName: num.friendly_name || num.FriendlyName || '',
      sid: num.sid || num.Sid,
      voiceUrl: num.voice_url || num.VoiceUrl || '',
      voiceMethod: num.voice_method || num.VoiceMethod || '',
      statusCallbackUrl: num.status_callback_url || num.StatusCallbackUrl || '',
      capabilities: num.capabilities || num.Capabilities || {},
    }))
    
    return NextResponse.json({ ok: true, numbers: formatted })
  } catch (error: any) {
    console.error('Failed to list numbers:', error)
    return NextResponse.json({ 
      ok: false, 
      error: error.message || String(error) 
    }, { status: 500 })
  }
}

// POST - Setup a number for incoming calls
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phoneNumber, voiceUrl, voiceMethod = 'POST' } = body
    
    if (!phoneNumber) {
      return NextResponse.json({ 
        ok: false, 
        error: 'phoneNumber is required' 
      }, { status: 400 })
    }
    
    // Get the SID for this phone number
    const listUrl = `${getCompatBase()}/IncomingPhoneNumbers.json?PageSize=100`
    const listRes = await fetch(listUrl, { 
      headers: { ...getAuthHeader() }, 
      cache: 'no-store' 
    })
    
    if (!listRes.ok) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Failed to fetch numbers' 
      }, { status: listRes.status })
    }
    
    const data = await listRes.json()
    const numbers = data?.incoming_phone_numbers || data?.IncomingPhoneNumbers || []
    const match = numbers.find((num: any) => {
      const num_phone = num.phone_number || num.PhoneNumber
      return String(num_phone) === String(phoneNumber)
    })
    
    if (!match) {
      return NextResponse.json({ 
        ok: false, 
        error: `Phone number ${phoneNumber} not found in your account` 
      }, { status: 404 })
    }
    
    const sid = match.sid || match.Sid
    
    // Update the VoiceUrl
    const updateUrl = `${getCompatBase()}/IncomingPhoneNumbers/${sid}.json`
    const payload = new URLSearchParams({
      VoiceUrl: voiceUrl || '',
      VoiceMethod: voiceMethod,
    })
    
    const updateRes = await fetch(updateUrl, {
      method: 'POST',
      headers: { 
        ...getAuthHeader(), 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: payload.toString(),
      cache: 'no-store',
    })
    
    if (!updateRes.ok) {
      const text = await updateRes.text()
      return NextResponse.json({ 
        ok: false, 
        error: 'Failed to update number',
        details: text 
      }, { status: updateRes.status })
    }
    
    const result = await updateRes.json()
    
    return NextResponse.json({ 
      ok: true, 
      message: `Number ${phoneNumber} configured successfully`,
      number: {
        phoneNumber: result.phone_number || result.PhoneNumber,
        voiceUrl: result.voice_url || result.VoiceUrl,
        voiceMethod: result.voice_method || result.VoiceMethod,
      }
    })
  } catch (error: any) {
    console.error('Failed to setup number:', error)
    return NextResponse.json({ 
      ok: false, 
      error: error.message || String(error) 
    }, { status: 500 })
  }
}
