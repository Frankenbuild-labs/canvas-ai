import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Checking CRM tables in Supabase...\n');
  
  // Check leads
  const { data: leads, error: leadsErr } = await supabase
    .from('crm_leads')
    .select('*', { count: 'exact', head: true });
  console.log(`✅ crm_leads: ${leadsErr ? '❌ ' + leadsErr.message : leads?.length + ' records (count)'}`);
  
  // Check lists
  const { data: lists, error: listsErr } = await supabase
    .from('crm_lead_lists')
    .select('*', { count: 'exact' });
  console.log(`✅ crm_lead_lists: ${listsErr ? '❌ ' + listsErr.message : lists?.length + ' lists'}`);
  
  // Check list members
  const { data: members, error: membersErr } = await supabase
    .from('crm_lead_list_members')
    .select('*', { count: 'exact', head: true });
  console.log(`✅ crm_lead_list_members: ${membersErr ? '❌ ' + membersErr.message : 'exists'}`);
  
  // Check if surveys table exists
  const { data: surveys, error: surveysErr } = await supabase
    .from('crm_surveys')
    .select('*', { count: 'exact' });
  console.log(`${surveysErr ? '❌' : '✅'} crm_surveys: ${surveysErr ? surveysErr.message : surveys?.length + ' surveys'}`);
  
  // Check if custom statuses table exists
  const { data: statuses, error: statusesErr } = await supabase
    .from('crm_custom_statuses')
    .select('*');
  console.log(`${statusesErr ? '❌' : '✅'} crm_custom_statuses: ${statusesErr ? statusesErr.message : statuses?.length + ' records'}`);
  
  // Check if custom sources table exists
  const { data: sources, error: sourcesErr } = await supabase
    .from('crm_custom_sources')
    .select('*');
  console.log(`${sourcesErr ? '❌' : '✅'} crm_custom_sources: ${sourcesErr ? sourcesErr.message : sources?.length + ' records'}`);
}

checkTables();
