// Direct test of the LeadStore and provider execution
import { LeadStore } from './lib/leadgen/store.js'
import { runProviders } from './lib/leadgen/providers.js'

console.log('🔍 Testing LeadStore and Provider Execution\n')

// Create a test session
const params = {
  keywords: 'test',
  targetRole: 'Marketing Manager',
  industry: 'Technology',
  location: 'New York',
  platform: 'LinkedIn',
  depth: 'Standard',
  includeEmail: true,
  includePhone: true
}

console.log('Creating session...')
const session = LeadStore.createSession(params, null)
console.log(`✅ Session created: ${session.id}`)
console.log(`   Status: ${session.status}`)

// Check if we can retrieve it
const retrieved = LeadStore.getSession(session.id)
console.log(`\n✅ Session retrieved: ${retrieved ? 'YES' : 'NO'}`)

if (retrieved) {
  console.log(`   Status: ${retrieved.status}`)
  console.log(`   Params: ${JSON.stringify(retrieved.params, null, 2)}`)
  
  // Now try running providers
  console.log('\n🚀 Running providers...')
  try {
    LeadStore.updateStatus(session.id, 'running')
    await runProviders(session.id)
    LeadStore.updateStatus(session.id, 'completed')
    
    const final = LeadStore.getSession(session.id)
    console.log(`\n✅ Providers completed!`)
    console.log(`   Final status: ${final.status}`)
    console.log(`   Leads generated: ${final.leads.length}`)
    console.log(`   Providers used: ${final.providersUsed.join(', ')}`)
    
    if (final.leads.length > 0) {
      console.log(`\n📋 First 3 leads:`)
      final.leads.slice(0, 3).forEach((lead, i) => {
        console.log(`   ${i+1}. ${lead.name} - ${lead.title} at ${lead.company}`)
        console.log(`      📧 ${lead.email || 'N/A'}`)
        console.log(`      🎯 Confidence: ${lead.confidenceScore}%`)
      })
    }
  } catch (error) {
    console.error(`\n❌ Provider execution failed:`, error.message)
    console.error(error.stack)
  }
} else {
  console.error('❌ Could not retrieve session!')
}
