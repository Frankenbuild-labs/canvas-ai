import 'dotenv/config';

async function testListsAPI() {
  try {
    console.log('🔍 Testing CRM Lists API endpoint...');
    
    const response = await fetch('http://localhost:3002/api/crm/lists', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📊 Status:', response.status);
    const data = await response.json();
    console.log('📝 Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Success! Lists count:', data.lists?.length || 0);
      if (data.lists) {
        data.lists.forEach(list => {
          console.log(`  - ${list.name} (${list.leadIds?.length || 0} leads)`);
        });
      }
    } else {
      console.log('❌ API returned error');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testListsAPI();
