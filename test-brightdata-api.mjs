// Direct test of BrightData API
const token = '0b3a219e6cad4f809282fc01f71fcd835602d19ed24162fb23b660a41ddf3ab5'

const body = {
  query: 'Marketing Manager Technology',
  location: 'New York',
  country: 'US',
  limit: 25
}

console.log('Testing BrightData API...')
console.log('Request:', JSON.stringify(body, null, 2))

try {
  const res = await fetch('https://api.brightdata.com/datasets/v1/search', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(body)
  })
  
  console.log('\nStatus:', res.status)
  console.log('Status Text:', res.statusText)
  
  const text = await res.text()
  console.log('\nResponse:')
  console.log(text)
  
  try {
    const json = JSON.parse(text)
    console.log('\nParsed JSON:')
    console.log(JSON.stringify(json, null, 2))
  } catch (e) {
    console.log('(Not JSON)')
  }
  
} catch (error) {
  console.error('\nError:', error.message)
}
