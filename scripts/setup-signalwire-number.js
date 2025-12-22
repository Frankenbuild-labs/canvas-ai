#!/usr/bin/env node
// scripts/setup-signalwire-number.js
// Configure a SignalWire number for incoming calls

require('dotenv').config({ path: '.env.local' })

const projectId = process.env.SIGNALWIRE_PROJECT_ID
const token = process.env.SIGNALWIRE_API_TOKEN
const spaceUrl = process.env.SIGNALWIRE_SPACE_URL || process.env.SIGNALWIRE_SPACE_NAME
const space = spaceUrl ? spaceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

if (!projectId || !token || !space) {
  console.error('❌ Missing SignalWire credentials')
  process.exit(1)
}

const auth = Buffer.from(`${projectId}:${token}`).toString('base64')
const baseUrl = `https://${space}/api/laml/2010-04-01/Accounts/${projectId}`

const phoneNumber = process.argv[2]
const webhookUrl = process.argv[3]

if (!phoneNumber || !webhookUrl) {
  console.log('Usage: node scripts/setup-signalwire-number.js <phone-number> <webhook-url>')
  console.log('')
  console.log('Example:')
  console.log('  node scripts/setup-signalwire-number.js +12095289441 https://your-domain.com/api/voice/sw/incoming')
  console.log('')
  console.log('Available numbers:')
  
  // List available numbers
  fetch(`${baseUrl}/IncomingPhoneNumbers.json?PageSize=100`, {
    headers: { 'Authorization': `Basic ${auth}` }
  })
  .then(res => res.json())
  .then(data => {
    const numbers = data.incoming_phone_numbers || data.IncomingPhoneNumbers || []
    numbers.forEach((num, idx) => {
      const phone = num.phone_number || num.PhoneNumber
      console.log(`  ${idx + 1}. ${phone}`)
    })
  })
  .catch(err => console.error('Error listing numbers:', err.message))
  
  process.exit(0)
}

async function setupNumber() {
  try {
    console.log(`🔧 Configuring ${phoneNumber}...`)
    
    // Get the SID for this number
    const listRes = await fetch(`${baseUrl}/IncomingPhoneNumbers.json?PageSize=100`, {
      headers: { 'Authorization': `Basic ${auth}` }
    })
    
    if (!listRes.ok) {
      console.error(`❌ Failed to fetch numbers: ${listRes.status}`)
      process.exit(1)
    }
    
    const data = await listRes.json()
    const numbers = data.incoming_phone_numbers || data.IncomingPhoneNumbers || []
    const match = numbers.find(num => {
      const phone = num.phone_number || num.PhoneNumber
      return String(phone) === String(phoneNumber)
    })
    
    if (!match) {
      console.error(`❌ Number ${phoneNumber} not found in your account`)
      process.exit(1)
    }
    
    const sid = match.sid || match.Sid
    console.log(`   Found SID: ${sid}`)
    
    // Update the VoiceUrl
    const updateUrl = `${baseUrl}/IncomingPhoneNumbers/${sid}.json`
    const payload = new URLSearchParams({
      VoiceUrl: webhookUrl,
      VoiceMethod: 'POST',
    })
    
    const updateRes = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    })
    
    if (!updateRes.ok) {
      const text = await updateRes.text()
      console.error(`❌ Failed to update: ${updateRes.status}`)
      console.error(text)
      process.exit(1)
    }
    
    console.log(`✅ Number ${phoneNumber} configured successfully!`)
    console.log(`   VoiceUrl: ${webhookUrl}`)
    console.log(`   VoiceMethod: POST`)
    console.log('')
    console.log('💡 Test by calling the number now!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

setupNumber()
