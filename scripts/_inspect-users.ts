import sql from '../lib/database'

(async () => {
  try {
    console.log('Querying users table columns...')
    const cols = await sql("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'users'")
    console.log('users columns:', cols)
    const sample = await sql('SELECT * FROM users LIMIT 5')
    console.log('users sample rows (up to 5):', sample)
    process.exit(0)
  } catch (err) {
    console.error('Inspect users failed:', err)
    process.exit(1)
  }
})()
