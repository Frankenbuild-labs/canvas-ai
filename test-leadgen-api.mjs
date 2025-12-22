// Test lead generation without database - using in-memory only
const BASE_URL = 'http://localhost:3002'

async function testLeadGen() {
  console.log('🧪 Testing Lead Generation API (In-Memory Only)\n')
  
  // Step 1: Start lead extraction
  console.log('1️⃣ Starting lead extraction...')
  const startResponse = await fetch(`${BASE_URL}/api/lead-gen/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keywords: 'marketing automation',
      targetRole: 'Marketing Manager',
      industry: 'Technology',
      location: 'New York, NY',
      platform: 'LinkedIn',
      depth: 'Standard',
      includeEmail: true,
      includePhone: true
    })
  })
  
  if (!startResponse.ok) {
    const error = await startResponse.text()
    console.error('❌ Start failed:', error)
    return
  }
  
  const { sessionId } = await startResponse.json()
  console.log(`✅ Session created: ${sessionId}\n`)
  
  // Step 2: Subscribe to SSE stream
  console.log('2️⃣ Subscribing to lead stream...')
  console.log('━'.repeat(60))
  
  const streamUrl = `${BASE_URL}/api/lead-gen/stream?sessionId=${sessionId}`
  const eventSource = new EventSource(streamUrl)
  
  let leadCount = 0
  let completed = false
  
  eventSource.addEventListener('leads', (event) => {
    const data = JSON.parse(event.data)
    leadCount += data.leads.length
    console.log(`📊 Received ${data.leads.length} leads (total: ${leadCount})`)
    data.leads.forEach((lead, i) => {
      console.log(`   ${i+1}. ${lead.name} - ${lead.title} at ${lead.company}`)
      if (lead.email) console.log(`      📧 ${lead.email}`)
      if (lead.phone) console.log(`      📱 ${lead.phone}`)
      console.log(`      🎯 Confidence: ${lead.confidenceScore}%`)
    })
    console.log('')
  })
  
  eventSource.addEventListener('status', (event) => {
    const data = JSON.parse(event.data)
    console.log(`📢 Status: ${data.status}`)
    if (data.message) console.log(`   ${data.message}`)
    
    if (data.status === 'completed' || data.status === 'error') {
      completed = true
      eventSource.close()
      console.log('━'.repeat(60))
      console.log(`\n✅ Extraction ${data.status}!`)
      console.log(`📈 Total leads generated: ${leadCount}`)
      process.exit(0)
    }
  })
  
  eventSource.onerror = (error) => {
    console.error('❌ Stream error:', error)
    eventSource.close()
    process.exit(1)
  }
  
  // Timeout after 30 seconds
  setTimeout(() => {
    if (!completed) {
      console.log('\n⏱️ Timeout - closing stream')
      eventSource.close()
      console.log(`📈 Total leads received: ${leadCount}`)
      process.exit(0)
    }
  }, 30000)
}

// Note: Need eventsource polyfill for Node.js
import { EventSource } from 'eventsource'
globalThis.EventSource = EventSource

testLeadGen().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
