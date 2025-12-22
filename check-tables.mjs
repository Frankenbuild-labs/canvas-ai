// Quick test to check database tables
import pg from 'pg';
const { Client } = pg;

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('✅ Database connected');
    
    // Check for required tables
    const tables = ['tts_generations', 'voice_clones', 'voice_favorites', 'voice_usage_tracking'];
    
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} Table ${table}: ${exists ? 'exists' : 'missing'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
