import sql from '../lib/database'

(async () => {
  try {
    console.log('Querying crm_leads columns...')
    const cols = await sql("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'crm_leads'")
    console.log('crm_leads columns:', cols)
    const fk = await sql("SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='crm_leads'")
    console.log('crm_leads foreign keys:', fk)
    process.exit(0)
  } catch (err) {
    console.error('Inspect failed:', err)
    process.exit(1)
  }
})()
