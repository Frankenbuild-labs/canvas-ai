import type { EmailContact, EmailTemplate, MarketingCampaign } from './types'

// Simple in-memory sample data; replace with real DB later
const sampleContacts: EmailContact[] = [
  { id: 'c1', metadata: { first_name: 'Alex', last_name: 'Morgan', email: 'alex@example.com', status: { value: 'Active' } } },
  { id: 'c2', metadata: { first_name: 'Jordan', last_name: 'Lee', email: 'jordan@example.com', status: { value: 'Active' } } },
  { id: 'c3', metadata: { first_name: 'Sam', last_name: 'Rivera', email: 'sam@example.com', status: { value: 'Inactive' } } },
]

const sampleTemplates: EmailTemplate[] = [
  { id: 't1', metadata: { name: 'Welcome', template_type: { value: 'Announcement' }, active: true } },
  { id: 't2', metadata: { name: 'Weekly Digest', template_type: { value: 'Newsletter' }, active: true } },
]

const sampleCampaigns: MarketingCampaign[] = [
  { id: 'm1', metadata: { name: 'October Promo', status: { value: 'Draft' }, template: { metadata: { name: 'Welcome' } } } },
  { id: 'm2', metadata: { name: 'Q4 Kickoff', status: { value: 'Scheduled' }, template: { metadata: { name: 'Weekly Digest' } } } },
]

export async function getEmailContacts(limit = 10): Promise<EmailContact[]> {
  await new Promise(r => setTimeout(r, 50))
  return sampleContacts.slice(0, limit)
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  await new Promise(r => setTimeout(r, 50))
  return sampleTemplates
}

export async function getMarketingCampaigns(): Promise<MarketingCampaign[]> {
  await new Promise(r => setTimeout(r, 50))
  return sampleCampaigns
}
