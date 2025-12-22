const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserIds() {
  console.log('🔍 Checking user_ids in leads...\n');
  
  const { data, error } = await supabase
    .from('crm_leads')
    .select('user_id, name, email')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('Sample leads with user_ids:');
  data.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.name} - user_id: "${lead.user_id}"`);
  });

  console.log('\n📊 Unique user_ids in database:');
  const { data: userIds } = await supabase
    .from('crm_leads')
    .select('user_id');
  
  const unique = [...new Set(userIds.map(l => l.user_id))];
  unique.forEach(id => console.log(`   - "${id}"`));
}

checkUserIds();
