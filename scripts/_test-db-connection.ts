import { DatabaseService } from '../lib/database'

(async () => {
  console.log('Testing database connection (DatabaseService.testConnection())...')
  try {
    const ok = await DatabaseService.testConnection()
    console.log('Connection test result:', ok)
    process.exit(ok ? 0 : 2)
  } catch (err) {
    console.error('Connection test threw error:', err)
    process.exit(1)
  }
})()
