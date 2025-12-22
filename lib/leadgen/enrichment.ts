// Email and contact enrichment services
// Uses Hunter.io API for email finding and verification

interface EnrichmentResult {
  email?: string | null
  phone?: string | null
  confidence: number
}

/**
 * Calculate confidence score based on data completeness
 */
export function calculateConfidenceScore(data: {
  name?: string
  company?: string
  email?: string
  phone?: string
  linkedinUrl?: string
  hasContent?: boolean
}): number {
  let score = 0
  
  // Base score from LinkedIn profile
  if (data.linkedinUrl) score += 30
  
  // Name presence (required)
  if (data.name && data.name !== 'Unknown') score += 20
  
  // Company information
  if (data.company && data.company !== 'Unknown') score += 15
  
  // Contact information
  if (data.email) score += 20
  if (data.phone) score += 10
  
  // Content/bio available
  if (data.hasContent) score += 5
  
  return Math.min(100, score)
}

/**
 * Extract email from LinkedIn profile using Hunter.io
 */
export async function findEmailByLinkedIn(
  linkedinUrl: string,
  name: string,
  company?: string
): Promise<string | null> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) {
    console.warn('[Enrichment] No HUNTER_API_KEY found - skipping email enrichment')
    return null
  }

  try {
    // Extract domain from company name or LinkedIn URL
    let domain: string | null = null
    
    if (company && company !== 'Unknown') {
      // Try to guess domain from company name
      domain = company.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/inc|llc|ltd|corp|corporation/gi, '') + '.com'
    }

    if (!domain) {
      console.log('[Enrichment] No company domain available for', name)
      return null
    }

    // Use Hunter.io Email Finder API
    const [firstName, ...lastNameParts] = name.split(' ')
    const lastName = lastNameParts.join(' ')

    if (!firstName || !lastName) {
      console.log('[Enrichment] Name format not suitable for lookup:', name)
      return null
    }

    const params = new URLSearchParams({
      domain: domain,
      first_name: firstName,
      last_name: lastName,
      api_key: apiKey
    })

    const response = await fetch(`https://api.hunter.io/v2/email-finder?${params}`)
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[Enrichment] Hunter.io rate limit reached')
      } else {
        console.warn('[Enrichment] Hunter.io API error:', response.status)
      }
      return null
    }

    const data = await response.json()
    
    if (data.data?.email && data.data?.score > 50) {
      console.log('[Enrichment] Found email for', name, '- confidence:', data.data.score)
      return data.data.email
    }

    return null
  } catch (error: any) {
    console.error('[Enrichment] Email lookup error:', error.message)
    return null
  }
}

/**
 * Find phone number using various methods (placeholder for future implementation)
 */
export async function findPhoneNumber(
  name: string,
  company?: string,
  linkedinUrl?: string
): Promise<string | null> {
  // TODO: Implement phone enrichment using services like:
  // - Clearbit
  // - RocketReach
  // - Apollo.io
  // For now, return null
  return null
}

/**
 * Enrich a lead with email and phone data
 */
export async function enrichLead(
  name: string,
  company: string,
  linkedinUrl?: string,
  includeEmail: boolean = true,
  includePhone: boolean = true
): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    email: null,
    phone: null,
    confidence: 0
  }

  // Find email if requested
  if (includeEmail && linkedinUrl) {
    result.email = await findEmailByLinkedIn(linkedinUrl, name, company)
  }

  // Find phone if requested
  if (includePhone) {
    result.phone = await findPhoneNumber(name, company, linkedinUrl)
  }

  // Calculate confidence based on available data
  result.confidence = calculateConfidenceScore({
    name,
    company,
    email: result.email || undefined,
    phone: result.phone || undefined,
    linkedinUrl,
    hasContent: !!linkedinUrl
  })

  return result
}
