import axios from 'axios';

// UPDATE THIS WITH YOUR NEW RENDER URL
const BASE_URL = 'https://superconnector-v2.onrender.com';

async function testDeployment() {
  console.log('\n🚀 Testing New Deployment\n');
  
  // 1. Health check
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', health.data);
  } catch (err) {
    console.log('❌ Health check failed:', err.message);
  }
  
  // 2. Test greeting
  try {
    const response = await axios.post(
      `${BASE_URL}/webhook/whatsapp`,
      'From=whatsapp%3A%2B12125551234&Body=Hi&ProfileName=Test',
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const message = response.data.match(/<Message>([\s\S]*?)<\/Message>/)?.[1];
    console.log('\n✅ Greeting Response:', message);
  } catch (err) {
    console.log('❌ Greeting test failed:', err.message);
  }
  
  // 3. Test call request
  try {
    const response = await axios.post(
      `${BASE_URL}/webhook/whatsapp`,
      'From=whatsapp%3A%2B12125551234&Body=call%20me&ProfileName=Test',
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const message = response.data.match(/<Message>([\s\S]*?)<\/Message>/)?.[1];
    console.log('\n✅ Call Request Response:', message);
    console.log('   Emoji present:', message.includes('📞') ? '✅' : '❌');
  } catch (err) {
    console.log('❌ Call request test failed:', err.message);
  }
  
  console.log('\n✨ Test Complete!\n');
}

testDeployment();
