#!/usr/bin/env node
// scripts/check-signalwire-numbers.js
// Check SignalWire number configuration

require('dotenv').config({ path: '.env.local' })

const projectId = process.env.SIGNALWIRE_PROJECT_ID
const token = process.env.SIGNALWIRE_API_TOKEN
const spaceUrl = process.env.SIGNALWIRE_SPACE_URL || process.env.SIGNALWIRE_SPACE_NAME
const space = spaceUrl ? spaceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

if (!projectId || !token || !space) {
  console.error('❌ Missing SignalWire credentials in .env.local')
  console.error('Required: SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL (or SIGNALWIRE_SPACE_NAME)')
  console.error(`Current values: projectId=${!!projectId}, token=${!!token}, space=${!!space}`)
  process.exit(1)
}

const auth = Buffer.from(`${projectId}:${token}`).toString('base64')
const baseUrl = `https://${space}/api/laml/2010-04-01/Accounts/${projectId}`

async function checkNumbers() {
  console.log('🔍 Checking SignalWire numbers...\n')
  
  try {
    const response = await fetch(`${baseUrl}/IncomingPhoneNumbers.json?PageSize=100`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    })
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`)
      const text = await response.text()
      console.error(text)
      process.exit(1)
    }
    
    const data = await response.json()
    const numbers = data.incoming_phone_numbers || data.IncomingPhoneNumbers || []
    
    if (numbers.length === 0) {
      console.log('📞 No phone numbers found in your account')
      console.log('   Purchase numbers at: https://your-space.signalwire.com/phone_numbers')
      return
    }
    
    console.log(`📞 Found ${numbers.length} number(s):\n`)
    
    numbers.forEach((num, idx) => {
      const phone = num.phone_number || num.PhoneNumber
      const friendly = num.friendly_name || num.FriendlyName || '(no name)'
      const voiceUrl = num.voice_url || num.VoiceUrl || '(not configured)'
      const voiceMethod = num.voice_method || num.VoiceMethod || 'POST'
      const sid = num.sid || num.Sid
      
      console.log(`${idx + 1}. ${phone}`)
      console.log(`   Name: ${friendly}`)
      console.log(`   SID: ${sid}`)
      console.log(`   VoiceUrl: ${voiceUrl}`)
      console.log(`   VoiceMethod: ${voiceMethod}`)
      
      if (!voiceUrl || voiceUrl === '(not configured)') {
        console.log(`   ⚠️  WARNING: No VoiceUrl configured - incoming calls will fail!`)
      }
      console.log('')
    })
    
    console.log('💡 To configure a number for incoming calls:')
    console.log('   1. Make sure your app is running (pnpm dev)')
    console.log('   2. Use the /api/voice/sw/numbers/setup endpoint')
    console.log('   3. Or configure directly in SignalWire dashboard')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkNumbers()
