import 'dotenv/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local explicitly
config({ path: resolve(__dirname, '../.env.local') })

import sql from '../lib/database'
import { insertLeads } from '../lib/crm-db'
import { randomUUID } from 'crypto'

async function testCRMUpload() {
  console.log('🔍 Testing CRM Upload Functionality...\n')

  try {
    // Step 1: Check if crm_leads table exists
    console.log('1️⃣ Checking if crm_leads table exists...')
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'crm_leads'
      ) as exists
    `
    
    if (!tableCheck[0]?.exists) {
      console.error('❌ crm_leads table does not exist!')
      console.log('\n📝 Run this SQL to create it:')
      console.log('node scripts/migrate-all.mjs')
      return
    }
    console.log('✅ crm_leads table exists')

    // Step 2: Check table structure
    console.log('\n2️⃣ Checking crm_leads table structure...')
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'crm_leads'
      ORDER BY ordinal_position
    `
    console.log('Columns:', columns.map(c => `${c.column_name} (${c.data_type})`).join(', '))

    // Step 3: Check if we need UUID extension
    console.log('\n3️⃣ Checking PostgreSQL extensions...')
    const extensions = await sql`
      SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto')
    `
    console.log('Extensions:', extensions.map(e => e.extname).join(', '))

    // Step 4: Get or create test user
    console.log('\n4️⃣ Getting test user...')
    let testUserId: string
    
    // Check if we have a users table
    const usersTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists
    `
    
    if (usersTableCheck[0]?.exists) {
      // Try to get existing user
      const users = await sql`SELECT id FROM users LIMIT 1`
      if (users.length > 0) {
        testUserId = users[0].id
        console.log(`✅ Using existing user: ${testUserId}`)
      } else {
        // Create test user
        const newUserId = randomUUID()
        await sql`INSERT INTO users (id, email, name) VALUES (${newUserId}, 'test@example.com', 'Test User')`
        testUserId = newUserId
        console.log(`✅ Created test user: ${testUserId}`)
      }
    } else {
      // No users table, use a test UUID
      testUserId = '00000000-0000-0000-0000-000000000001'
      console.log(`⚠️ No users table, using test UUID: ${testUserId}`)
    }

    // Step 5: Test inserting a lead
    console.log('\n5️⃣ Testing lead insert...')
    const testLead = {
      name: 'Test Lead',
      email: 'testlead@example.com',
      company: 'Test Company',
      phone: '+1234567890',
      position: 'CEO',
      status: 'new',
      value: 5000,
      source: 'test',
      notes: 'This is a test lead created by test-crm-upload.ts'
    }

    const created = await insertLeads(testUserId, [testLead])
    console.log('✅ Lead created successfully!')
    console.log('Lead ID:', created[0].id)
    console.log('Lead data:', JSON.stringify(created[0], null, 2))

    // Step 6: Verify the lead was inserted
    console.log('\n6️⃣ Verifying lead was inserted...')
    const verify = await sql`SELECT * FROM crm_leads WHERE id = ${created[0].id}`
    if (verify.length > 0) {
      console.log('✅ Lead verified in database!')
    } else {
      console.error('❌ Lead not found in database!')
    }

    // Step 7: Clean up test lead
    console.log('\n7️⃣ Cleaning up test lead...')
    await sql`DELETE FROM crm_leads WHERE id = ${created[0].id}`
    console.log('✅ Test lead deleted')

    console.log('\n✨ All tests passed! CRM upload is working correctly.')

  } catch (error: any) {
    console.error('\n❌ Error during test:', error)
    console.error('Error details:', error.message)
    if (error.code) {
      console.error('Error code:', error.code)
    }
    process.exit(1)
  }
}

testCRMUpload().then(() => {
  console.log('\n✅ Test completed')
  process.exit(0)
}).catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
