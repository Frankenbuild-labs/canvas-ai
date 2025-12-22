const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

async function testQuery() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Test the exact query the app uses
    console.log('Testing query with user_id check...');
    const result1 = await client.query(`
      SELECT COUNT(*)::int AS count 
      FROM crm_leads 
      WHERE user_id = $1
    `, ['11111111-1111-1111-1111-111111111111']);
    console.log(`Leads for user '11111111-1111-1111-1111-111111111111': ${result1.rows[0].count}`);

    // Test without user_id filter
    console.log('\nTesting query without user_id filter...');
    const result2 = await client.query(`SELECT COUNT(*)::int AS count FROM crm_leads`);
    console.log(`Total leads in database: ${result2.rows[0].count}`);

    // Get sample lead with all fields
    console.log('\nSample lead data:');
    const result3 = await client.query(`SELECT * FROM crm_leads LIMIT 1`);
    console.log(JSON.stringify(result3.rows[0], null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testQuery();
