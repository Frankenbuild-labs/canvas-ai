export function hasFeature(name: string): boolean {
  // Normalize: feature keys like 'leadgen:advanced' -> FEATURE_LEADGEN_ADVANCED
  const envKey = 'FEATURE_' + name.toUpperCase().replace(/[\s:\.-]/g, '_')
  const val = process.env[envKey]
  return val === '1' || val === 'true' || val === 'on' || val === 'enabled'
}

export function getLeadgenFeatures() {
  return {
    advanced: hasFeature('leadgen:advanced'),
    brightdata: hasFeature('leadgen:brightdata')
  }
}
