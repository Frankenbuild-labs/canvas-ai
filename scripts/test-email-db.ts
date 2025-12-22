// Test script to check email database connection and tables
import { config } from "dotenv";
import { Client } from "pg";

// Load environment variables
config({ path: ".env.local" });

async function testDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  console.log("Testing email marketing database...\n");

  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL environment variable is not set!");
      process.exit(1);
    }
    console.log("✅ DATABASE_URL is configured");

    // Connect to database
    await client.connect();
    console.log("✅ Connected to database");

    // Check if email_contacts table exists
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'email_%'
      ORDER BY table_name
    `);
    
    console.log("\n📊 Email marketing tables:");
    tablesResult.rows.forEach((t: any) => console.log(`  - ${t.table_name}`));

    if (tablesResult.rows.length === 0) {
      console.log("\n❌ No email marketing tables found!");
      console.log("💡 Run: docker exec -i canvasai-postgres psql -U postgres -d postgres < scripts/004_create_email_marketing_tables.sql");
      await client.end();
      process.exit(1);
    }

    // Check email_contacts structure
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'email_contacts'
      ORDER BY ordinal_position
    `);

    console.log("\n📋 email_contacts columns:");
    columnsResult.rows.forEach((c: any) => 
      console.log(`  - ${c.column_name}: ${c.data_type} (${c.is_nullable === 'YES' ? 'nullable' : 'required'})`)
    );

    // Count existing contacts
    const countResult = await client.query(`SELECT COUNT(*) as count FROM email_contacts`);
    console.log(`\n👥 Total contacts: ${countResult.rows[0].count}`);

    // Count existing lists
    const listCountResult = await client.query(`SELECT COUNT(*) as count FROM email_lists`);
    console.log(`📋 Total lists: ${listCountResult.rows[0].count}`);

    // Try to create a test contact
    console.log("\n🧪 Testing contact creation...");
    const testEmail = `test-${Date.now()}@example.com`;
    
    const insertResult = await client.query(`
      INSERT INTO email_contacts (email, first_name, last_name, status, tags, subscribe_date)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `, [testEmail, 'Test', 'User', 'Active', ['test']]);

    console.log("✅ Contact created successfully!");
    console.log("Contact data:", {
      id: insertResult.rows[0].id,
      email: insertResult.rows[0].email,
      first_name: insertResult.rows[0].first_name,
      status: insertResult.rows[0].status
    });

    // Clean up test contact
    await client.query(`DELETE FROM email_contacts WHERE email = $1`, [testEmail]);
    console.log("🧹 Test contact cleaned up");

    console.log("\n✅ All tests passed! Email database is working correctly.");

    await client.end();

  } catch (error) {
    console.error("\n❌ Error:", error);
    await client.end();
    process.exit(1);
  }
}

testDatabase();
