import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXPECTED_EMAIL_TABLES = [
  'email_templates',
  'email_campaigns',
  'campaign_sends',
  'email_media',
  'email_settings',
  'email_messages',
  'email_domains'
];

async function checkEmailTables() {
  console.log('🔍 Checking Email Marketing tables in Supabase...\n');
  
  const results = [];
  let allExist = true;

  for (const table of EXPECTED_EMAIL_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(0);

      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${table} - MISSING (table does not exist)`);
          results.push({ table, exists: false, error: 'Table does not exist' });
          allExist = false;
        } else {
          console.log(`❌ ${table} - ERROR: ${error.message}`);
          results.push({ table, exists: false, error: error.message });
          allExist = false;
        }
      } else {
        console.log(`✅ ${table} - EXISTS`);
        results.push({ table, exists: true });
      }
    } catch (err) {
      console.log(`❌ ${table} - ERROR: ${err.message}`);
      results.push({ table, exists: false, error: err.message });
      allExist = false;
    }
  }

  console.log('\n---\n');

  if (allExist) {
    console.log('✅ All email marketing tables exist!');
    console.log('\n📝 Next steps:');
    console.log('1. Start dev server: npm run dev');
    console.log('2. Test templates: http://localhost:3002/email/templates');
    console.log('3. Test campaigns: http://localhost:3002/email/campaigns');
    console.log('4. Test media: http://localhost:3002/email/media');
    console.log('5. Test settings: http://localhost:3002/email/settings');
  } else {
    console.log('❌ Some tables are missing!');
    console.log('\n📋 To fix this:');
    console.log('1. Open Supabase Dashboard → SQL Editor');
    console.log('2. Open: setup-email-tables.sql in this project');
    console.log('3. Copy the entire file contents');
    console.log('4. Paste into Supabase SQL Editor and click "Run"');
    console.log('5. Run this script again: node check-email-tables.js');
    console.log('\nOr run directly from terminal:');
    console.log('  cat setup-email-tables.sql | pbcopy  # macOS');
    console.log('  Get-Content setup-email-tables.sql | Set-Clipboard  # Windows PowerShell');
  }
  
  console.log('\n📊 CRM Integration Status:');
  
  try {
    const { count: leadsCount } = await supabase
      .from('crm_leads')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ crm_leads: ${leadsCount} contacts available for email campaigns`);
    
    const { count: listsCount } = await supabase
      .from('crm_lead_lists')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ crm_lead_lists: ${listsCount} lists available as campaign targets`);
  } catch (err) {
    console.log(`⚠️  CRM tables not accessible: ${err.message}`);
  }
}

checkEmailTables();

