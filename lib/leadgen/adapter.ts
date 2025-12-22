import { getPrisma } from "../prisma"
import { LeadSearchParams } from "./store"

export async function createSessionPersistent(params: LeadSearchParams, userId: string | null) {
  const prisma = getPrisma()
  const session = await prisma.leadGenSession.create({
    data: {
      userId: userId || null,
      status: 'PENDING',
      depth: params.depth,
      targetRole: params.targetRole,
      industry: params.industry,
      location: params.location || null,
      keywords: params.keywords,
      includeEmail: params.includeEmail,
      includePhone: params.includePhone
    }
  })
  return session
}

interface NewLeadInput {
  name: string
  title: string
  company: string
  email?: string | null
  phone?: string | null
  location?: string | null
  confidenceScore: number
  sourcePlatform: string
  sourceUrl?: string
  tags: string[]
}

export async function addLeadsPersistent(sessionId: string, leads: NewLeadInput[]) {
  const prisma = getPrisma()
  if (!leads.length) return
  await prisma.lead.createMany({
    data: leads.map(l => ({
      sessionId,
      name: l.name,
      title: l.title,
      company: l.company,
      email: l.email || null,
      phone: l.phone || null,
      location: l.location || null,
      confidenceScore: l.confidenceScore,
      sourcePlatform: l.sourcePlatform,
      sourceUrl: l.sourceUrl,
      tags: l.tags
    })),
    skipDuplicates: true
  })
}

export async function updateSessionStatus(sessionId: string, status: 'PENDING'|'RUNNING'|'COMPLETED'|'ERROR') {
  const prisma = getPrisma()
  await prisma.leadGenSession.update({ where: { id: sessionId }, data: { status, finishedAt: (status === 'COMPLETED' || status === 'ERROR') ? new Date() : undefined } })
}

export async function addProvidersPersistent(sessionId: string, providerIds: string[]) {
  const prisma = getPrisma()
  await prisma.leadProviderUsage.createMany({ data: providerIds.map(pid => ({ sessionId, providerId: pid })) , skipDuplicates: true })
}
