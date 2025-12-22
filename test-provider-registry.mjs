// Test why providers aren't activating
import { hasFeature } from './lib/feature-flags.js'
import { providerRegistry } from './lib/leadgen/providers.js'

console.log('🔍 Provider Registry Debug\n')

console.log('Environment Variables:')
console.log(`  FEATURE_LEADGEN_MOCK: ${process.env.FEATURE_LEADGEN_MOCK}`)
console.log(`  FEATURE_LEADGEN_BRIGHTDATA: ${process.env.FEATURE_LEADGEN_BRIGHTDATA}`)
console.log(`  BRIGHTDATA_API_TOKEN: ${process.env.BRIGHTDATA_API_TOKEN ? 'SET' : 'NOT SET'}`)

console.log('\nFeature Flags:')
console.log(`  leadgen:mock -> ${hasFeature('leadgen:mock')}`)
console.log(`  leadgen:brightdata -> ${hasFeature('leadgen:brightdata')}`)

console.log(`\nProvider Registry (${providerRegistry.length} providers):`)
providerRegistry.forEach(p => {
  console.log(`  - ${p.id}`)
})

const testParams = {
  keywords: 'test',
  targetRole: 'Marketing Manager',
  industry: 'Technology',
  location: 'New York',
  platform: 'LinkedIn',
  depth: 'Standard',
  includeEmail: true,
  includePhone: true
}

console.log('\nTesting provider.supports() with test params:')
providerRegistry.forEach(p => {
  const supports = p.supports(testParams)
  console.log(`  - ${p.id}: ${supports ? '✅ YES' : '❌ NO'}`)
  
  if (!supports && p.id === 'brightdata') {
    console.log(`    Reason: hasFeature('leadgen:brightdata') = ${hasFeature('leadgen:brightdata')}`)
  }
})
