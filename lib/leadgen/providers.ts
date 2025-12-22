import { LeadStore, LeadSearchParams } from "./store"
import { hasFeature } from "../feature-flags"
import { addLeadsPersistent, addProvidersPersistent } from "./adapter"
import { enrichLead, calculateConfidenceScore } from "./enrichment"

export interface RawLead {
  name: string
  title: string
  company: string
  email?: string | null
  phone?: string | null
  location?: string | null
  sourcePlatform: string
  sourceUrl?: string
  confidenceScore: number
  tags: string[]
}

export interface SourceProvider {
  id: string
  supports(params: LeadSearchParams): boolean
  fetch(params: LeadSearchParams): Promise<RawLead[]>
  // Optional streaming mode: yields batches incrementally for real-time SSE
  fetchStream?(params: LeadSearchParams): AsyncGenerator<RawLead[], void, void>
}

// Mock provider generates deterministic sample leads for UI testing.
export class MockProvider implements SourceProvider {
  id = "mock"
  supports(_params: LeadSearchParams) { return hasFeature('leadgen:mock') }
  async fetch(params: LeadSearchParams): Promise<RawLead[]> {
    const total = 25
    const leads: RawLead[] = []
    for (let i = 0; i < total; i++) {
      leads.push({
        name: `Jane Doe ${i+1}`,
        title: params.targetRole,
        company: `ExampleCorp ${i+1}`,
        email: params.includeEmail ? `jane.doe${i+1}@example.com` : null,
        phone: params.includePhone ? `+1-555-000${i}` : null,
        location: params.location,
        sourcePlatform: params.platform,
        confidenceScore: 70 + (i % 10),
        tags: [params.industry.toLowerCase(), "sample"],
        sourceUrl: `https://example.com/profile/${i+1}`
      })
    }
    return leads
  }
  async *fetchStream(params: LeadSearchParams): AsyncGenerator<RawLead[]> {
    const batchSize = 5
    const all = await this.fetch(params)
    for (let i = 0; i < all.length; i += batchSize) {
      yield all.slice(i, i + batchSize)
      // Simulate delay to demonstrate streaming (remove in prod)
      await new Promise(r => setTimeout(r, 250))
    }
  }
}

// Exa Websets provider: AI-powered lead generation with enrichment
export class ExaWebsetsProvider implements SourceProvider {
  id = "exa"
  supports(params: LeadSearchParams) {
    return true // Exa works for all platforms
  }
  
  // Map platform to Exa category or search strategy
  private getSearchStrategy(platform: string): { category?: string; includeDomains?: string[] } {
    const platformMap: Record<string, { category?: string; includeDomains?: string[] }> = {
      'LinkedIn': { category: 'linkedin profile' },
      'Twitter/X': { category: 'tweet' },
      'Instagram': { includeDomains: ['instagram.com'] }, // No specific category, use domain filter
      'Facebook': { includeDomains: ['facebook.com'] }, // No specific category, use domain filter
      'TikTok': { includeDomains: ['tiktok.com'] }, // No specific category, use domain filter
      'YouTube': { includeDomains: ['youtube.com'] }, // No specific category, use domain filter
      'Reddit': { includeDomains: ['reddit.com'] }, // No specific category, use domain filter
      'General Web': { category: 'personal site' } // Use personal site category for general web
    }
    return platformMap[platform] || { category: 'personal site' }
  }
  
  async fetch(params: LeadSearchParams): Promise<RawLead[]> {
    const apiKey = process.env.EXA_API_KEY
    if (!apiKey) {
      console.warn('[ExaWebsetsProvider] Missing EXA_API_KEY')
      return []
    }
    
    try {
      // Use numResults from params, default to 25
      const numResults = params.numResults || 25
      
      // Get platform-specific search strategy
      const strategy = this.getSearchStrategy(params.platform)
      
      // Build query based on platform
      const query = `${params.targetRole} ${params.industry} ${params.location}`
      console.log('[ExaWebsetsProvider] Searching', params.platform, 'for', numResults, 'leads with query:', query)
      
      // Build request body
      const requestBody: any = {
        query: query,
        numResults: numResults,
        contents: {
          text: true,
        }
      }
      
      // Add category or domain filter based on strategy
      if (strategy.category) {
        requestBody.category = strategy.category
      }
      if (strategy.includeDomains) {
        requestBody.includeDomains = strategy.includeDomains
      }
      
      // If user provided a targetUrl for General Web, use it as includeDomains
      if (params.platform === 'General Web' && params.targetUrl) {
        const cleanDomain = params.targetUrl
          .replace(/^https?:\/\//, '') // Remove protocol
          .replace(/^www\./, '')        // Remove www
          .split('/')[0]                // Get just domain
        requestBody.includeDomains = [cleanDomain]
        console.log('[ExaWebsetsProvider] Targeting specific domain:', cleanDomain)
      }
      
      const searchResponse = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text()
        console.error('[ExaWebsetsProvider] Search error:', searchResponse.status, errorText)
        return []
      }

      const searchData = await searchResponse.json()
      const results = searchData.results || []
      console.log('[ExaWebsetsProvider] Got', results.length, params.platform, 'profiles')

      // Transform to RawLead format with enrichment
      const leads: RawLead[] = []
      
      for (const result of results) {
        // Extract name from title based on platform
        let name = 'Unknown'
        
        if (params.platform === 'LinkedIn') {
          // LinkedIn format: "Name | LinkedIn"
          const titleParts = result.title?.split('|') || []
          name = titleParts[0]?.trim() || 'Unknown'
        } else if (params.platform === 'Twitter/X') {
          // Twitter format varies, try to extract from title
          name = result.title?.replace(/(@\w+).*/, '$1').trim() || 'Unknown'
        } else {
          // For other platforms, use the full title
          name = result.title?.trim() || 'Unknown'
        }
        
        // Try to extract company from content
        const content = result.text || ''
        let company = 'Unknown'
        
        // Platform-specific company extraction
        if (params.platform === 'LinkedIn') {
          // Look for "at Company" or "@ Company" patterns
          const companyMatch = content.match(/(?:at|@)\s+([A-Z][A-Za-z0-9\s&,.'-]+?)(?:\s+\||$|\.|\n)/i)
          if (companyMatch) {
            company = companyMatch[1].trim()
          }
        }
        
        // Enrich with email/phone if requested (works best for LinkedIn/personal sites)
        let email = null
        let phone = null
        let confidenceScore = 0
        
        if ((params.includeEmail || params.includePhone) && (params.platform === 'LinkedIn' || params.platform === 'General Web')) {
          console.log('[ExaWebsetsProvider] Enriching lead:', name)
          const enrichment = await enrichLead(
            name, 
            company, 
            result.url,
            params.includeEmail,
            params.includePhone
          )
          email = enrichment.email
          phone = enrichment.phone
          confidenceScore = enrichment.confidence
        } else {
          // Calculate base confidence without enrichment
          confidenceScore = calculateConfidenceScore({
            name,
            company,
            linkedinUrl: result.url,
            hasContent: !!content
          })
        }
        
        leads.push({
          name: name,
          title: params.targetRole,
          company: company,
          email: email,
          phone: phone,
          location: params.location,
          sourcePlatform: params.platform,
          sourceUrl: result.url,
          confidenceScore: confidenceScore,
          tags: [params.industry?.toLowerCase() || 'business', params.platform.toLowerCase().replace(/\//g, '-')],
        })
      }
      
      console.log('[ExaWebsetsProvider] Returning', leads.length, 'enriched leads')
      return leads
      
    } catch (error: any) {
      console.error('[ExaWebsetsProvider] Error:', error.message, error.stack)
      return []
    }
  }
  
  async *fetchStream(params: LeadSearchParams): AsyncGenerator<RawLead[]> {
    const all = await this.fetch(params)
    const batchSize = 5
    for (let i = 0; i < all.length; i += batchSize) {
      yield all.slice(i, i + batchSize)
      await new Promise(r => setTimeout(r, 500))
    }
  }
}

// Bright Data provider: REST API for LinkedIn data
export class BrightDataProvider implements SourceProvider {
  id = "brightdata"
  supports(params: LeadSearchParams) {
    if (!hasFeature('leadgen:brightdata')) return false
    return params.platform === 'LinkedIn'
  }
  
  async fetch(params: LeadSearchParams): Promise<RawLead[]> {
    const token = process.env.BRIGHTDATA_API_TOKEN
    if (!token) {
      console.warn('[BrightDataProvider] Missing BRIGHTDATA_API_TOKEN')
      return []
    }
    
    try {
      const keyword = params.targetRole || params.keywords || 'Manager'
      const location = params.location || 'United States'
      const country = guessCountryCode(params.location)
      
      console.log('[BrightDataProvider] Triggering LinkedIn Job Listings discovery')
      console.log('[BrightDataProvider] Keyword:', keyword)
      console.log('[BrightDataProvider] Location:', location)
      console.log('[BrightDataProvider] Country:', country)
      
      // Use Job Listings API - "Discover by Keyword" endpoint
      // Dataset: gd_lpfll7v5hcqtkxl6l with discover_by=keyword
      const triggerResponse = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lpfll7v5hcqtkxl6l&discover_by=keyword&include_errors=false', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            keyword: keyword,
            location: location,
            country: country,
          }
        ])
      })

      if (!triggerResponse.ok) {
        const errorText = await triggerResponse.text()
        console.error('[BrightDataProvider] Trigger API error:', triggerResponse.status, errorText)
        return []
      }

      const triggerData = await triggerResponse.json()
      const snapshotId = triggerData.snapshot_id

      console.log('[BrightDataProvider] Triggered collection, snapshot ID:', snapshotId)

      // Poll for results (max 2 minutes)
      let attempts = 0
      const maxAttempts = 60
      let jobs: any[] = []

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const snapshotResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        })

        if (snapshotResponse.ok) {
          const snapshotData = await snapshotResponse.json()
          
          console.log('[BrightDataProvider] Snapshot status:', snapshotData.status)
          
          if (snapshotData.status === 'ready') {
            jobs = snapshotData.data || []
            console.log('[BrightDataProvider] Got', jobs.length, 'job listings')
            break
          }
        }

        attempts++
        if (attempts % 5 === 0) {
          console.log('[BrightDataProvider] Still polling... attempt', attempts, '/', maxAttempts)
        }
      }

      if (jobs.length === 0) {
        console.warn('[BrightDataProvider] No jobs found after polling')
        return []
      }

      // Transform job listings to leads
      // Focus on job_poster (the recruiter/hiring manager)
      const leads: RawLead[] = jobs
        .filter((job: any) => job.job_poster) // Only jobs with poster info
        .map((job: any) => {
          const poster = job.job_poster || {}
          return {
            name: poster.name || job.company_name || 'Unknown',
            title: job.job_title || params.targetRole,
            company: job.company_name || 'Unknown',
            email: params.includeEmail ? null : null, // Jobs don't have contact info
            phone: params.includePhone ? null : null,
            location: job.job_location || params.location || null,
            sourcePlatform: params.platform,
            sourceUrl: job.apply_link || poster.url || undefined,
            confidenceScore: 75,
            tags: [params.industry?.toLowerCase() || 'business', params.platform.toLowerCase()],
          }
        })
      
      console.log('[BrightDataProvider] Returning', leads.length, 'leads from job posters')
      return leads
      
    } catch (error: any) {
      console.error('[BrightDataProvider] Error:', error.message, error.stack)
      return []
    }
  }
  
  async *fetchStream(params: LeadSearchParams): AsyncGenerator<RawLead[]> {
    const all = await this.fetch(params)
    const batchSize = 5
    for (let i = 0; i < all.length; i += batchSize) {
      yield all.slice(i, i + batchSize)
      await new Promise(r => setTimeout(r, 500))
    }
  }
}

// Build registry dynamically so mock can be disabled in production
const providers: SourceProvider[] = []
if (hasFeature('leadgen:mock')) providers.push(new MockProvider())
providers.push(new ExaWebsetsProvider()) // Primary provider - Exa only
// BrightData disabled - Exa handles all lead gen
export const providerRegistry: SourceProvider[] = providers

export async function runProviders(sessionId: string) {
  const session = LeadStore.getSession(sessionId)
  if (!session) {
    console.error(`[runProviders] Session not found: ${sessionId}`)
    throw new Error("Session not found")
  }
  const params = session.params

  console.log(`[runProviders] Starting for session ${sessionId}`)
  console.log(`[runProviders] Total providers in registry: ${providerRegistry.length}`)
  providerRegistry.forEach(p => {
    console.log(`[runProviders]   - ${p.id} (supports: ${p.supports(params)})`)
  })

  const activeProviders = providerRegistry.filter(p => p.supports(params))
  const providerIds = activeProviders.map(p => p.id)
  console.log(`[runProviders] Active providers: ${providerIds.join(', ') || 'NONE'}`)
  
  if (activeProviders.length === 0) {
    console.error(`[runProviders] NO ACTIVE PROVIDERS! Feature flags:`, {
      mock: hasFeature('leadgen:mock'),
      brightdata: hasFeature('leadgen:brightdata')
    })
    return
  }
  
  LeadStore.addProviders(sessionId, providerIds)
  
  // Skip database persistence for now
  // await addProvidersPersistent(sessionId, providerIds)
  console.log(`[runProviders] Using providers: ${providerIds.join(', ')} for session ${sessionId}`)

  for (const provider of activeProviders) {
    console.log(`[runProviders] Running provider: ${provider.id}`)
    if (provider.fetchStream) {
      for await (const chunk of provider.fetchStream(params)) {
        const scoredChunk = chunk.map(r => ({ ...r, confidenceScore: computeConfidenceScore(r, params) }))
        LeadStore.addLeads(sessionId, scoredChunk)
        // Skip database persistence for now
        // await addLeadsPersistent(sessionId, scoredChunk)
        console.log(`[runProviders] Added ${scoredChunk.length} leads from ${provider.id}`)
      }
    } else {
      const rawLeads = await provider.fetch(params)
      const scored = rawLeads.map(r => ({ ...r, confidenceScore: computeConfidenceScore(r, params) }))
      LeadStore.addLeads(sessionId, scored)
      // Skip database persistence for now
      // await addLeadsPersistent(sessionId, scored)
      console.log(`[runProviders] Added ${scored.length} leads from ${provider.id}`)
    }
  }
  console.log(`[runProviders] Completed for session ${sessionId}`)
}

function computeConfidenceScore(lead: RawLead, params: LeadSearchParams): number {
  let score = lead.confidenceScore || 50
  // Title relevance
  const roleTokens = params.targetRole.toLowerCase().split(/\s+/).filter(Boolean)
  const titleLc = (lead.title || '').toLowerCase()
  const matchedTokens = roleTokens.filter(t => titleLc.includes(t)).length
  if (matchedTokens) score += matchedTokens * 5
  // Email / phone presence
  if (lead.email) score += 12
  if (lead.phone) score += 6
  // Company presence
  if (!lead.company) score -= 10
  // Location hint (if user specified location and lead matches substring)
  if (params.location && (lead.location || '').toLowerCase().includes(params.location.toLowerCase().split(',')[0])) {
    score += 8
  }
  // Clamp
  if (score > 100) score = 100
  if (score < 0) score = 0
  return Math.round(score)
}

function guessCountryCode(location: string): string | null {
  const lc = location.toLowerCase()
  if (/\bfrance|paris\b/.test(lc)) return 'FR'
  if (/\bkenya|nairobi\b/.test(lc)) return 'KE'
  if (/\b(united states|usa|new york|san francisco|austin|chicago)\b/.test(lc)) return 'US'
  if (/\bunited kingdom|london\b/.test(lc)) return 'GB'
  if (/\bcanada|toronto|vancouver\b/.test(lc)) return 'CA'
  if (/\bindia|mumbai|bangalore|bengaluru|delhi\b/.test(lc)) return 'IN'
  return null
}
