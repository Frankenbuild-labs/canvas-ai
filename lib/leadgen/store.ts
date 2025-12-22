// Temporary in-memory persistence for lead extraction sessions until DB tables are added.
// NOTE: This should be replaced with DatabaseService backed storage later.

// Use global to survive Next.js hot reloads and share across API route isolates
const globalForSessions = global as unknown as {
  leadSessions?: Map<string, LeadSearchSession>
  leadIndex?: Set<string>
}

export interface LeadSearchParams {
  keywords: string
  location: string
  platform: string
  includeEmail: boolean
  includePhone: boolean
  includeAddress?: boolean
  profileUrls?: string[]
  targetRole: string
  industry: string
  numResults?: number
  targetUrl?: string
}

export interface LeadSearchSession {
  id: string
  userId: string | null
  params: LeadSearchParams
  status: "pending" | "running" | "completed" | "error"
  errorMessage?: string
  startedAt: Date
  finishedAt?: Date
  leads: Lead[]
  providersUsed: string[]
}

export interface Lead {
  id: string
  name: string
  title: string
  company: string
  email?: string | null
  phone?: string | null
  // Use location to carry address-like detail if available
  location?: string | null
  sourcePlatform: string
  sourceUrl?: string
  confidenceScore: number
  tags: string[]
  createdAt: Date
  aiScore?: number
  aiSummary?: string
  aiOutreach?: string
}

class LeadStoreImpl {
  private sessions: Map<string, LeadSearchSession>
  private leadIndex: Set<string>
  
  constructor() {
    // Use global storage to survive Next.js isolates
    if (!globalForSessions.leadSessions) {
      globalForSessions.leadSessions = new Map()
      globalForSessions.leadIndex = new Set()
      console.log('[LeadStore] Initialized global storage')
    }
    this.sessions = globalForSessions.leadSessions
    this.leadIndex = globalForSessions.leadIndex!
  }

  createSession(params: LeadSearchParams, userId: string | null): LeadSearchSession {
    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    return this.createSessionWithId(id, params, userId)
  }

  createSessionWithId(id: string, params: LeadSearchParams, userId: string | null): LeadSearchSession {
    const session: LeadSearchSession = {
      id,
      userId,
      params,
      status: "pending",
      startedAt: new Date(),
      leads: [],
      providersUsed: []
    }
    this.sessions.set(id, session)
    return session
  }

  getSession(id: string): LeadSearchSession | undefined {
    return this.sessions.get(id)
  }

  updateStatus(id: string, status: LeadSearchSession["status"], errorMessage?: string) {
    const s = this.sessions.get(id)
    if (!s) return
    s.status = status
    if (status === "completed" || status === "error") s.finishedAt = new Date()
    if (errorMessage) s.errorMessage = errorMessage
  }

  addProviders(id: string, providers: string[]) {
    const s = this.sessions.get(id)
    if (!s) return
    for (const p of providers) if (!s.providersUsed.includes(p)) s.providersUsed.push(p)
  }

  addLeads(id: string, newLeads: Omit<Lead, "id" | "createdAt">[]) {
    const s = this.sessions.get(id)
    if (!s) return
    for (const raw of newLeads) {
      const hash = (raw.name + raw.company + raw.title).toLowerCase().replace(/\s+/g, "|")
      if (this.leadIndex.has(hash)) continue
      this.leadIndex.add(hash)
      s.leads.push({
        id: `lead_${Math.random().toString(36).slice(2,11)}`,
        createdAt: new Date(),
        confidenceScore: raw.confidenceScore,
        tags: raw.tags,
        name: raw.name,
        title: raw.title,
        company: raw.company,
        email: raw.email,
        phone: raw.phone,
        location: raw.location,
        sourcePlatform: raw.sourcePlatform,
        sourceUrl: raw.sourceUrl,
        aiScore: raw.aiScore,
        aiSummary: raw.aiSummary,
        aiOutreach: raw.aiOutreach
      })
    }
  }
}

export const LeadStore = new LeadStoreImpl()
