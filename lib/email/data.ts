import type { EmailContact, EmailTemplate, MarketingCampaign } from './types'

// Lightweight in-memory sample data; replace with your DB adapter later
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

// Adapter abstraction: swap this to your own DB later
export async function getEmailDashboardData(): Promise<{
  contacts: EmailContact[]
  templates: EmailTemplate[]
  campaigns: MarketingCampaign[]
}> {
  // Simulate async source
  await new Promise((r) => setTimeout(r, 10))
  return { contacts: sampleContacts, templates: sampleTemplates, campaigns: sampleCampaigns }
}
