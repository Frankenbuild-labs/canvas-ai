import 'dotenv/config';

async function testAPI() {
  try {
    console.log('🔍 Testing CRM API endpoint...');
    
    const response = await fetch('http://localhost:3002/api/crm/leads', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📊 Status:', response.status);
    const text = await response.text();
    console.log('📝 Response:', text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('✅ Success! Leads count:', data.leads?.length || 0);
    } else {
      console.log('❌ API returned error');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
