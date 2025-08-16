const https = require('https');

const SERVICE_URL = 'https://superconnector-backend-klye.onrender.com';

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// Test data
const TEST_PHONE = 'whatsapp:+917428170779';

// Make HTTP request
function makeRequest(path, method = 'GET', data = null) {
    const url = new URL(SERVICE_URL + path);
    
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// Test functions
async function testHealth() {
    console.log('\n📋 Testing Health Endpoint...');
    try {
        const response = await makeRequest('/health');
        const data = JSON.parse(response.body);
        
        if (response.status === 200 && (data.status === 'ok' || data.status === 'healthy')) {
            console.log(`${colors.green}✅ Health check passed${colors.reset}`);
            console.log(`   Version: ${data.version}`);
            console.log(`   Timestamp: ${data.timestamp}`);
            return true;
        } else {
            console.log(`${colors.red}❌ Health check failed${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}❌ Health check error: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testWebhookVerification() {
    console.log('\n🔐 Testing WhatsApp Webhook Verification...');
    try {
        const verifyToken = 'superconnector_verify_2024';
        const challenge = 'test_challenge_123';
        const response = await makeRequest(`/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`);
        
        if (response.status === 200 && response.body === challenge) {
            console.log(`${colors.green}✅ Webhook verification passed${colors.reset}`);
            return true;
        } else {
            console.log(`${colors.red}❌ Webhook verification failed${colors.reset}`);
            console.log(`   Response: ${response.body}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}❌ Webhook verification error: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testGreeting() {
    console.log('\n👋 Testing Greeting Flow...');
    try {
        // Use Twilio format
        const webhookData = {
            From: TEST_PHONE,
            Body: 'Hi',
            ProfileName: 'Test User'
        };
        
        const response = await makeRequest('/webhook/whatsapp', 'POST', webhookData);
        
        if (response.status === 200) {
            console.log(`${colors.green}✅ Greeting test passed${colors.reset}`);
            console.log(`   Response status: ${response.status}`);
            return true;
        } else {
            console.log(`${colors.red}❌ Greeting test failed${colors.reset}`);
            console.log(`   Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}❌ Greeting test error: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testCallRequest() {
    console.log('\n📞 Testing Call Request...');
    try {
        // Use Twilio format
        const webhookData = {
            From: TEST_PHONE,
            Body: 'call me',
            ProfileName: 'Test User'
        };
        
        const response = await makeRequest('/webhook/whatsapp', 'POST', webhookData);
        
        if (response.status === 200) {
            console.log(`${colors.green}✅ Call request test passed${colors.reset}`);
            console.log(`   Should trigger VAPI call`);
            return true;
        } else {
            console.log(`${colors.red}❌ Call request test failed${colors.reset}`);
            console.log(`   Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}❌ Call request test error: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testEmojiSupport() {
    console.log('\n😊 Testing Emoji Support...');
    try {
        // Use Twilio format
        const webhookData = {
            From: TEST_PHONE,
            Body: 'Send me an emoji',
            ProfileName: 'Test User'
        };
        
        const response = await makeRequest('/webhook/whatsapp', 'POST', webhookData);
        
        if (response.status === 200) {
            console.log(`${colors.green}✅ Emoji support test passed${colors.reset}`);
            console.log(`   Response should contain emojis like 👋 🎯 💡`);
            return true;
        } else {
            console.log(`${colors.red}❌ Emoji support test failed${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}❌ Emoji test error: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testCallHistory() {
    console.log('\n📝 Testing Call History Query...');
    try {
        // Use Twilio format  
        const webhookData = {
            From: TEST_PHONE,
            Body: 'What did we discuss in our last call?',
            ProfileName: 'Test User'
        };
        
        const response = await makeRequest('/webhook/whatsapp', 'POST', webhookData);
        
        if (response.status === 200) {
            console.log(`${colors.green}✅ Call history test passed${colors.reset}`);
            console.log(`   Should retrieve actual call summaries from database`);
            return true;
        } else {
            console.log(`${colors.red}❌ Call history test failed${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}❌ Call history test error: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testVAPIWebhook() {
    console.log('\n🔗 Testing VAPI Webhook...');
    try {
        const vapiData = {
            type: 'call-ended',
            phoneNumber: '+917428170779',
            transcript: 'Test transcript',
            summary: 'Test summary from VAPI call',
            duration: 120
        };
        
        const response = await makeRequest('/webhook/vapi', 'POST', vapiData);
        
        if (response.status === 200) {
            console.log(`${colors.green}✅ VAPI webhook test passed${colors.reset}`);
            console.log(`   Should save call summary to database`);
            return true;
        } else {
            console.log(`${colors.red}❌ VAPI webhook test failed${colors.reset}`);
            console.log(`   Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}❌ VAPI webhook test error: ${error.message}${colors.reset}`);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('=====================================');
    console.log('🧪 Production Deployment Test Suite');
    console.log('=====================================');
    console.log(`\nTarget: ${colors.blue}${SERVICE_URL}${colors.reset}`);
    console.log(`Time: ${new Date().toISOString()}`);
    
    const tests = [
        { name: 'Health Check', fn: testHealth },
        { name: 'Webhook Verification', fn: testWebhookVerification },
        { name: 'Greeting Flow', fn: testGreeting },
        { name: 'Call Request', fn: testCallRequest },
        { name: 'Emoji Support', fn: testEmojiSupport },
        { name: 'Call History', fn: testCallHistory },
        { name: 'VAPI Webhook', fn: testVAPIWebhook }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        const result = await test.fn();
        if (result) passed++;
        else failed++;
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=====================================');
    console.log('📊 Test Results Summary');
    console.log('=====================================');
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`Total: ${tests.length}`);
    
    if (failed === 0) {
        console.log(`\n${colors.green}🎉 All tests passed! Deployment is working correctly.${colors.reset}`);
    } else {
        console.log(`\n${colors.yellow}⚠️  Some tests failed. Check the logs above for details.${colors.reset}`);
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Update your Twilio WhatsApp webhook to:', `${SERVICE_URL}/webhook/whatsapp`);
    console.log('2. Monitor logs at: https://dashboard.render.com/web/srv-d2fm9cje5dus73aun9qg');
    console.log('3. Test with real WhatsApp messages');
}

// Run the tests
runTests().catch(console.error);
