import { getEmailContacts } from '@/lib/email-marketing/database'
import type { EmailContact } from '@/lib/email-marketing/types'

interface DuplicateGroup {
  email: string
  contacts: EmailContact[]
  count: number
}

interface DuplicateStats {
  totalContacts: number
  uniqueEmails: number
  duplicateEmails: number
  totalDuplicates: number
  duplicateGroups: DuplicateGroup[]
}

export async function findDuplicateContacts(): Promise<DuplicateStats> {
  console.log('🔍 Starting duplicate contact detection...')

  // Fetch contacts in pages via DB adapter
  let allContacts: EmailContact[] = []
  let skip = 0
  const limit = 500
  let total = 0

  while (true) {
    const { contacts, total: t } = await getEmailContacts({ limit, skip })
    total = t
    allContacts.push(...contacts)
    if (contacts.length < limit) break
    skip += limit
  }

  console.log(`📊 Loaded ${allContacts.length} contacts (reported total: ${total})`)

  // Group by normalized email
  const emailGroups = new Map<string, EmailContact[]>()
  for (const c of allContacts) {
    const email = c.metadata.email?.toLowerCase().trim()
    if (!email) continue
    const arr = emailGroups.get(email) || []
    arr.push(c)
    emailGroups.set(email, arr)
  }

  const duplicateGroups: DuplicateGroup[] = []
  let totalDuplicates = 0

  for (const [email, contacts] of emailGroups) {
    if (contacts.length > 1) {
      const sorted = contacts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      duplicateGroups.push({ email, contacts: sorted, count: sorted.length })
      totalDuplicates += sorted.length - 1
    }
  }

  duplicateGroups.sort((a, b) => b.count - a.count)

  return {
    totalContacts: allContacts.length,
    uniqueEmails: emailGroups.size,
    duplicateEmails: duplicateGroups.length,
    totalDuplicates,
    duplicateGroups,
  }
}

export async function generateDuplicateReport(): Promise<void> {
  const fs = await import('fs')
  const path = await import('path')
  const stats = await findDuplicateContacts()

  console.log('\n📋 DUPLICATE CONTACTS REPORT')
  console.log('='.repeat(50))
  console.log(`📊 Total Contacts: ${stats.totalContacts}`)
  console.log(`✅ Unique Emails: ${stats.uniqueEmails}`)
  console.log(`🔄 Duplicate Emails: ${stats.duplicateEmails}`)
  console.log(`❌ Total Duplicates: ${stats.totalDuplicates}`)

  const csvHeader = 'Email,Duplicate Count,Contact IDs,Names,Statuses,Created Dates\n'
  let csvContent = csvHeader
  for (const group of stats.duplicateGroups) {
    const ids = group.contacts.map(c => c.id).join('; ')
    const names = group.contacts.map(c => `${c.metadata.first_name || ''} ${c.metadata.last_name || ''}`.trim()).join('; ')
    const statuses = group.contacts.map(c => (c.metadata.status?.value || c.metadata.status?.key || '')).join('; ')
    const dates = group.contacts.map(c => new Date(c.created_at).toISOString()).join('; ')
    csvContent += `"${group.email}",${group.count},"${ids}","${names}","${statuses}","${dates}"\n`
  }

  const reportsDir = path.join(process.cwd(), 'reports')
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir)
  const filename = `duplicate-contacts-${new Date().toISOString().split('T')[0]}.csv`
  const filepath = path.join(reportsDir, filename)
  fs.writeFileSync(filepath, csvContent)
  console.log(`\n📄 CSV report saved to: ${filepath}`)
}

if (require.main === module) {
  generateDuplicateReport().catch((e) => { console.error(e); process.exit(1) })
}
