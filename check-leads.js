const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLeads() {
  console.log('🔍 Checking leads in database...\n');
  
  const { data, error, count } = await supabase
    .from('crm_leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Found ${count} total leads in database\n`);
  data.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.name} (${lead.email}) - ${lead.company || 'No company'}`);
    console.log(`   Created: ${lead.created_at}`);
  });
}

checkLeads();
