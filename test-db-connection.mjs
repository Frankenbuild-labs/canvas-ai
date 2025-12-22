import 'dotenv/config';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
config({ path: resolve(__dirname, '.env.local') });

console.log('🔍 Testing Database Connection...\n');
console.log('Environment variables:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('- SUPABASE_DATABASE_URL:', process.env.SUPABASE_DATABASE_URL ? '✅ Set' : '❌ Not set');

// Import after env is loaded
const { default: sql } = await import('./lib/database.js');

async function testConnection() {
  try {
    console.log('\n1️⃣ Testing basic database connection...');
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Database connected successfully!');
    console.log('   Server time:', result[0].current_time);
    console.log('   PostgreSQL version:', result[0].pg_version.split(' ')[0]);

    console.log('\n2️⃣ Checking if crm_leads table exists...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'crm_leads'
      ) as exists
    `;
    
    if (!tableCheck[0]?.exists) {
      console.error('❌ crm_leads table does NOT exist!');
      console.log('\n📝 To create the table, run:');
      console.log('   node scripts/migrate-all.mjs');
      return;
    }
    console.log('✅ crm_leads table exists');

    console.log('\n3️⃣ Checking table structure...');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'crm_leads'
      ORDER BY ordinal_position
    `;
    console.log('   Columns:', columns.map(c => c.column_name).join(', '));

    console.log('\n4️⃣ Counting existing leads...');
    const countResult = await sql`SELECT COUNT(*)::int as count FROM crm_leads`;
    console.log(`   Found ${countResult[0].count} leads in database`);

    console.log('\n5️⃣ Testing lead insertion...');
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const leadId = crypto.randomUUID();
    
    await sql`
      INSERT INTO crm_leads (
        id, user_id, name, email, company, status, value, created_at, updated_at
      ) VALUES (
        ${leadId}, ${testUserId}, 'Test Lead DB Connection', 
        'test@dbconnection.com', 'Test Company', 'new', 1000, NOW(), NOW()
      )
    `;
    console.log('✅ Test lead inserted successfully!');
    console.log('   Lead ID:', leadId);

    console.log('\n6️⃣ Verifying lead was saved...');
    const verify = await sql`SELECT * FROM crm_leads WHERE id = ${leadId}`;
    if (verify.length > 0) {
      console.log('✅ Lead verified in database!');
      console.log('   Name:', verify[0].name);
      console.log('   Email:', verify[0].email);
      console.log('   Company:', verify[0].company);
    }

    console.log('\n7️⃣ Cleaning up test lead...');
    await sql`DELETE FROM crm_leads WHERE id = ${leadId}`;
    console.log('✅ Test lead deleted');

    console.log('\n✨ All database tests passed! Connection is working perfectly.');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.error('\nFull error:', error);
  }
}

testConnection();
