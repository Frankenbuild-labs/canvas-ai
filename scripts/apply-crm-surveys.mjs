// Apply only the CRM surveys migration (015)
import { Client } from 'pg'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'
import dotenv from 'dotenv'
import chalk from 'chalk'

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: join(__dirname, '..', '.env.local') })

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }
  const url = new URL(DATABASE_URL)
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  const needsSsl = !isLocal
  if (needsSsl) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const client = new Client({ connectionString: DATABASE_URL, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) })
  await client.connect()
  try {
    const filePath = join(__dirname, '015_create_crm_surveys.sql')
    const sql = await readFile(filePath, 'utf-8')
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log(chalk.green('Applied 015_create_crm_surveys.sql'))
  } catch (e) {
    await client.query('ROLLBACK')
    if (/already exists/i.test(String(e.message))) {
      console.log(chalk.yellow('Migration already applied or table exists.'))
    } else {
      console.error(e)
      process.exit(1)
    }
  } finally {
    await client.end()
  }
}

main()
