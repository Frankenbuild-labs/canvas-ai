import { findDuplicateContacts } from './check-duplicates'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function cleanupDuplicates(dryRun: boolean = true): Promise<void> {
  const stats = await findDuplicateContacts()
  if (stats.duplicateGroups.length === 0) {
    console.log('No duplicates found.')
    return
  }

  let deleted = 0
  for (const group of stats.duplicateGroups) {
    const sorted = [...group.contacts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const keep = sorted[0]
    const toDelete = sorted.slice(1)

    for (const dup of toDelete) {
      if (dryRun) {
        console.log(`[DRY] Would delete contact ${dup.id} (${dup.metadata.email})`)
        deleted++
      } else {
        await sql.query('DELETE FROM email_contacts WHERE id = $1', [dup.id])
        console.log(`Deleted contact ${dup.id}`)
        deleted++
      }
    }
  }

  console.log(`${dryRun ? 'Would delete' : 'Deleted'} ${deleted} duplicate rows`)
}

if (require.main === module) {
  const dry = !process.argv.includes('--live')
  cleanupDuplicates(dry).catch((e) => { console.error(e); process.exit(1) })
}
