const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function testLogin() {
    console.log('🧪 Testing Login Fix...\n');

    try {
        // Test data
        const testUser = {
            email: 'adadad@gmail.com',
            password: 'testpassword123'
        };

        console.log('📝 Test User:', testUser.email);
        console.log('🔐 Testing login...\n');

        // Test login
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, testUser);

        if (loginResponse.status === 200) {
            console.log('✅ Login successful!');
            console.log('📊 Response status:', loginResponse.status);
            console.log('🎯 User data:', {
                id: loginResponse.data.data.user._id,
                email: loginResponse.data.data.user.email,
                firstName: loginResponse.data.data.user.firstName,
                lastName: loginResponse.data.data.user.lastName
            });
            console.log('🔑 Token received:', loginResponse.data.data.token ? 'Yes' : 'No');
            console.log('🔄 Refresh token received:', loginResponse.data.data.refreshToken ? 'Yes' : 'No');
        }

    } catch (error) {
        console.error('❌ Login test failed:');
        
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📝 Error message:', error.response.data?.message || error.response.data);
            console.error('🔍 Error details:', error.response.data?.error || 'No details');
        } else if (error.request) {
            console.error('🌐 Network error - no response received');
            console.error('🔍 Request details:', error.message);
        } else {
            console.error('⚠️ Error:', error.message);
        }
    }
}

async function testInvalidLogin() {
    console.log('\n🧪 Testing Invalid Login...\n');

    try {
        const invalidUser = {
            email: 'adadad@gmail.com',
            password: 'wrongpassword'
        };

        console.log('📝 Test User:', invalidUser.email);
        console.log('🔐 Testing invalid login...\n');

        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, invalidUser);
        console.log('⚠️ Unexpected success with invalid credentials');

    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('✅ Invalid login correctly rejected');
            console.log('📊 Status:', error.response.status);
            console.log('📝 Message:', error.response.data?.message);
        } else {
            console.error('❌ Unexpected error:', error.response?.data || error.message);
        }
    }
}

async function testRateLimit() {
    console.log('\n🧪 Testing Rate Limiting...\n');

    const invalidUser = {
        email: 'test-rate-limit@example.com',
        password: 'wrongpassword'
    };

    console.log('📝 Testing rate limiting with multiple failed attempts...\n');

    for (let i = 1; i <= 6; i++) {
        try {
            console.log(`🔄 Attempt ${i}...`);
            await axios.post(`${API_BASE_URL}/auth/login`, invalidUser);
        } catch (error) {
            if (error.response) {
                console.log(`   Status: ${error.response.status} - ${error.response.data?.message}`);
                
                if (error.response.status === 429) {
                    console.log('✅ Rate limiting working correctly');
                    break;
                }
            }
        }
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function runAllTests() {
    console.log('🚀 Starting Login System Tests\n');
    console.log('=' .repeat(50));

    await testLogin();
    await testInvalidLogin();
    await testRateLimit();

    console.log('\n' + '='.repeat(50));
    console.log('🏁 All tests completed!');
}

// Run tests
runAllTests().catch(console.error);
