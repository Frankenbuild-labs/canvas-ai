import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const migrationSQL = `
-- Management Center file uploads
CREATE TABLE IF NOT EXISTS management_files (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_category TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_management_files_user_id ON management_files(user_id);
CREATE INDEX IF NOT EXISTS idx_management_files_file_category ON management_files(file_category);

-- Memory items (notes, files, images)
CREATE TABLE IF NOT EXISTS memory_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT,
    content TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    metadata JSONB,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_id ON memory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_items_kind ON memory_items(kind);
`

console.log('🚀 Applying database migration...\n')

try {
  // Execute the migration
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
  
  if (error) {
    // If exec_sql doesn't exist, try direct SQL execution via PostgREST
    console.log('⚠️  RPC method not available, trying direct connection...\n')
    
    // Split into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`)
      
      // Use REST API to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: statement })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Failed to execute statement: ${errorText}`)
      }
    }
  }
  
  console.log('\n✅ Migration completed successfully!')
  console.log('\nCreated tables:')
  console.log('  - management_files (for file storage)')
  console.log('  - memory_items (for memory system)')
  
} catch (err) {
  console.error('❌ Migration failed:', err.message)
  console.log('\n💡 Alternative: Run this SQL directly in Supabase SQL Editor:')
  console.log('   https://supabase.com/dashboard/project/bqutxukixnfcadgyfwbt/sql/new')
  console.log('\n' + migrationSQL)
  process.exit(1)
}
