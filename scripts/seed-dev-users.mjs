// Seed Development Users
// Creates test users for development/testing
// Usage: pnpm migrate:seed-users

import { Client } from 'pg'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import chalk from 'chalk'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Development test users
const DEV_USERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'dev@test.com',
    name: 'Dev User',
    subscription_tier: 'pro',
    subscription_status: 'active'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'test@test.com',
    name: 'Test User',
    subscription_tier: 'free',
    subscription_status: 'active'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'admin@test.com',
    name: 'Admin User',
    subscription_tier: 'enterprise',
    subscription_status: 'active'
  }
]

async function seedUsers(client) {
  console.log(chalk.blue('\n📝 Seeding development users...'))
  
  for (const user of DEV_USERS) {
    try {
      await client.query(`
        INSERT INTO users (id, email, name, subscription_tier, subscription_status, auth_provider)
        VALUES ($1, $2, $3, $4, $5, 'dev')
        ON CONFLICT (email) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          subscription_tier = EXCLUDED.subscription_tier,
          subscription_status = EXCLUDED.subscription_status,
          updated_at = NOW()
      `, [user.id, user.email, user.name, user.subscription_tier, user.subscription_status])
      
      console.log(chalk.green(`✅ Seeded: ${user.email} (${user.name})`))
    } catch (error) {
      console.error(chalk.red(`❌ Failed to seed: ${user.email}`))
      console.error(chalk.red(`   Error: ${error.message}`))
    }
  }
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL
  
  if (!DATABASE_URL) {
    console.error(chalk.red('❌ DATABASE_URL is not set in .env.local'))
    process.exit(1)
  }

  console.log(chalk.bold.cyan('\n🌱 Development User Seeder'))
  console.log(chalk.gray(`   Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`))

  const client = new Client({ connectionString: DATABASE_URL })
  
  try {
    await client.connect()
    console.log(chalk.green('✅ Connected to database'))

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.error(chalk.red('\n❌ Users table does not exist!'))
      console.error(chalk.yellow('   Run: pnpm migrate:all first'))
      process.exit(1)
    }

    await seedUsers(client)

    // Show all users
    const users = await client.query('SELECT id, email, name, subscription_tier FROM users ORDER BY created_at')
    console.log(chalk.cyan(`\n👥 All Users (${users.rows.length}):`))
    users.rows.forEach(user => {
      console.log(chalk.gray(`   • ${user.email.padEnd(25)} ${user.name?.padEnd(20) || ''.padEnd(20)} [${user.subscription_tier}]`))
      console.log(chalk.dim(`     ${user.id}`))
    })

    console.log(chalk.bold.green('\n🎉 User seeding completed!'))
    console.log(chalk.yellow('\n💡 Use these UUIDs in x-user-id header for testing:'))
    DEV_USERS.forEach(user => {
      console.log(chalk.dim(`   ${user.email.padEnd(20)} → ${user.id}`))
    })

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'))
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
