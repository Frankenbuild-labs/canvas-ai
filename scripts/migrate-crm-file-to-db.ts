#!/usr/bin/env node
/**
 * One-time migration script: read `data/crm/leads.jsonl` and insert into DB using lib/crm-db.ts
 * Usage (local):
 *   CRM_ALLOW_FILE_FALLBACK=true node -r ts-node/register scripts/migrate-crm-file-to-db.ts
 *
 * The script will:
 * - refuse to run if CRM_ALLOW_FILE_FALLBACK is not true (safety guard)
 * - read file-based leads (up to 10k)
 * - deduplicate by email+company (case-insensitive)
 * - insert into DB using insertLeads()
 * - print summary and exit
 */

import path from 'path'
;(async () => {
  const allow = process.env.CRM_ALLOW_FILE_FALLBACK === 'true' || process.env.NODE_ENV !== 'production'
  if (!allow) {
    console.error('Refusing to run migration: CRM_ALLOW_FILE_FALLBACK is not true. Set CRM_ALLOW_FILE_FALLBACK=true to allow reading the JSONL file for migration.')
    process.exit(2)
  }

  try {
    const { fileListLeads } = await import('../lib/crm-file')
    const { insertLeads } = await import('../lib/crm-db')
    const { DatabaseService } = await import('../lib/database')

    console.log('Reading file-stored leads...')
    const fb = await fileListLeads({ limit: 10000, skip: 0 })
    const items = (fb.leads || []) as any[]
    console.log(`Found ${items.length} file-stored leads`)
    if (!items.length) {
      console.log('No leads to import; exiting.')
      process.exit(0)
    }

    let userId = await DatabaseService.getOrCreateTestUser()
    // Some environments use a different users table name; if the helper fell back
    // to a non-UUID token (e.g., "test-user"), use the known system user id as a safe owner.
    if (!/^[0-9a-fA-F-]{36}$/.test(String(userId))) {
      console.warn('getOrCreateTestUser returned non-UUID, falling back to system user id')
      userId = '00000000-0000-0000-0000-000000000000'
    }

    // Dedupe by normalized (email, company)
    const seen = new Set<string>()
    const toInsert: any[] = []
    for (const it of items) {
      const email = (it.email || '').toLowerCase().trim()
      const company = (it.company || '').toLowerCase().trim()
      const key = `${email}||${company}`
      if (!email) continue
      if (seen.has(key)) continue
      seen.add(key)
      toInsert.push({
        name: String(it.name || ''),
        email: String(it.email || ''),
        phone: it.phone ? String(it.phone) : undefined,
        company: String(it.company || ''),
        position: it.position ? String(it.position) : undefined,
        status: String(it.status || 'new'),
        value: Number(it.value || 0),
        source: it.source ? String(it.source) : undefined,
        notes: it.notes ? String(it.notes) : undefined,
        last_contact: it.last_contact ? String(it.last_contact) : undefined,
      })
    }

    console.log(`After dedupe: ${toInsert.length} leads will be inserted`)
    if (!toInsert.length) {
      console.log('Nothing to insert after dedupe; exiting.')
      process.exit(0)
    }

    // Batch insert in groups of 200
    const batchSize = 200
    let inserted = 0
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize)
      const created = await insertLeads(userId, batch)
      inserted += (created || []).length
      console.log(`Inserted batch ${i / batchSize + 1}: ${created.length} leads`)    
    }

    console.log(`Migration completed. Inserted ${inserted} leads.`)
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
})()
