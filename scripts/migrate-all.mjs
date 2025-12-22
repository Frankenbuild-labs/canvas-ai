// Unified Database Migration Runner
// Runs all migrations in order from 000 to 011
// Usage: pnpm migrate:all

import { Client } from 'pg'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import chalk from 'chalk'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Migration files in order
const MIGRATIONS = [
  '000_create_users_table.sql',
  '001_create_social_tables.sql',
  '002_create_social_media_tables.sql',
  '003_run_social_setup.sql',
  '004_create_crm_leads.sql',
  '004_create_email_marketing_tables.sql',
  '005_create_studio_tables.sql',
  '010_create_voice_tables.sql',
  '011_create_signalwire_agents.sql',
  '012_create_voice_favorites.sql',
  '013_create_call_logs.sql'
  , '014_add_crm_documents.sql'
  , '015_create_crm_surveys.sql'
]

async function runMigration(client, filename) {
  const filePath = join(__dirname, filename)
  console.log(chalk.blue(`\n📄 Running migration: ${filename}`))
  
  try {
    const sql = await readFile(filePath, 'utf-8')
    
    // Execute the migration in a transaction
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    
    console.log(chalk.green(`✅ Successfully applied: ${filename}`))
    return { filename, success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(chalk.red(`❌ Failed to apply: ${filename}`))
    console.error(chalk.red(`   Error: ${error.message}`))
    return { filename, success: false, error: error.message }
  }
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL
  
  if (!DATABASE_URL) {
    console.error(chalk.red('❌ DATABASE_URL is not set in .env.local'))
    console.error(chalk.yellow('   Please set DATABASE_URL to your PostgreSQL connection string'))
    process.exit(1)
  }

  console.log(chalk.bold.cyan('\n🚀 Starting Unified Database Migration'))
  console.log(chalk.gray(`   Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`))
  console.log(chalk.gray(`   Migrations: ${MIGRATIONS.length} files\n`))

  // Enable SSL for managed Postgres providers (e.g., Supabase) to avoid self-signed cert errors
  const url = new URL(DATABASE_URL)
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  const needsSsl = !isLocal
  if (needsSsl) {
    // As a fallback, disable TLS verification for this process to handle providers with custom CAs
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
  const client = new Client({
    connectionString: DATABASE_URL,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  })
  
  try {
    await client.connect()
    console.log(chalk.green('✅ Connected to database'))

    // Test connection
    const result = await client.query('SELECT NOW() as time, version() as version')
    console.log(chalk.gray(`   PostgreSQL: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`))
    console.log(chalk.gray(`   Server Time: ${result.rows[0].time.toISOString()}`))

    // Run all migrations
    const results = []
    for (const migration of MIGRATIONS) {
      const result = await runMigration(client, migration)
      results.push(result)
      
      // Stop on first failure
      if (!result.success) {
        console.log(chalk.yellow('\n⚠️  Migration stopped due to error'))
        break
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log(chalk.bold.cyan('\n📊 Migration Summary'))
    console.log(chalk.green(`   ✅ Successful: ${successful}/${MIGRATIONS.length}`))
    if (failed > 0) {
      console.log(chalk.red(`   ❌ Failed: ${failed}/${MIGRATIONS.length}`))
    }

    if (failed === 0) {
      console.log(chalk.bold.green('\n🎉 All migrations completed successfully!'))
      
      // Show tables
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)
      console.log(chalk.cyan(`\n📋 Created Tables (${tables.rows.length}):`))
      tables.rows.forEach(row => {
        console.log(chalk.gray(`   • ${row.table_name}`))
      })
    } else {
      console.error(chalk.bold.red('\n❌ Migration failed. Please fix errors and try again.'))
      process.exit(1)
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Database connection error:'))
    console.error(chalk.red(`   ${error.message}`))
    process.exit(1)
  } finally {
    await client.end()
    console.log(chalk.gray('\n👋 Disconnected from database\n'))
  }
}

main().catch(error => {
  console.error(chalk.red('\n💥 Unexpected error:'))
  console.error(error)
  process.exit(1)
})
