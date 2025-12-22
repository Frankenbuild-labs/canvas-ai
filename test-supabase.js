const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...\n');
console.log('Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Service Role Key:', supabaseKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  try {
    console.log('\n1️⃣ Testing Supabase connection...');
    const { data, error } = await supabase
      .from('crm_leads')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ Table crm_leads does NOT exist!');
        console.log('\n📝 The table needs to be created. Run this SQL in Supabase:');
        console.log(`
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT NOT NULL,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  value NUMERIC NOT NULL DEFAULT 0,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_contact TIMESTAMPTZ,
  document_id TEXT,
  document_answers JSONB
);
        `);
        return;
      }
      throw error;
    }
    
    console.log('✅ Supabase connected and crm_leads table exists!');

    console.log('\n2️⃣ Testing lead insertion...');
    const testLead = {
      id: crypto.randomUUID(),
      user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Lead Supabase',
      email: 'test@supabase.com',
      company: 'Supabase Test Co',
      status: 'new',
      value: 5000
    };

    const { data: inserted, error: insertError } = await supabase
      .from('crm_leads')
      .insert(testLead)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert test lead:', insertError.message);
      throw insertError;
    }

    console.log('✅ Test lead inserted successfully!');
    console.log('   Lead ID:', inserted.id);
    console.log('   Name:', inserted.name);

    console.log('\n3️⃣ Cleaning up test lead...');
    const { error: deleteError } = await supabase
      .from('crm_leads')
      .delete()
      .eq('id', testLead.id);

    if (deleteError) throw deleteError;
    console.log('✅ Test lead deleted');

    console.log('\n✨ All Supabase tests passed! Database is working correctly.');

  } catch (error) {
    console.error('\n❌ Supabase test failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    console.error('\nFull error:', error);
  }
}

testSupabase();
