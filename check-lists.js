import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLists() {
  console.log('🔍 Checking lead lists in database...');
  
  const { data: lists, error } = await supabase
    .from('crm_lead_lists')
    .select('*');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`\n✅ Found ${lists?.length || 0} lists:`);
  if (lists && lists.length > 0) {
    for (const list of lists) {
      console.log(`\n📋 List: ${list.name}`);
      console.log(`   ID: ${list.id}`);
      console.log(`   User ID: ${list.user_id}`);
      console.log(`   Created: ${list.created_at}`);
      
      // Check members
      const { data: members } = await supabase
        .from('crm_lead_list_members')
        .select('lead_id')
        .eq('list_id', list.id);
      
      console.log(`   Leads: ${members?.length || 0}`);
    }
  }
}

checkLists();
