const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function testAuthMe() {
    console.log('🔍 Testing /auth/me endpoint specifically\n');

    try {
        // Step 1: Register a new user
        console.log('📝 Step 1: Registering new user...');
        const registerData = {
            firstName: 'AuthMe',
            lastName: 'Test',
            email: `authme${Date.now()}@example.com`,
            password: 'AuthMePassword123!',
            phone: '+1234567890'
        };

        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
        console.log('✅ Registration successful:', registerResponse.status);
        
        const token = registerResponse.data.data.token;
        console.log('🔑 Token received:', token ? 'Yes' : 'No');
        console.log('🔑 Token length:', token ? token.length : 0);
        
        if (!token) {
            console.log('❌ No token received, cannot test /auth/me');
            return;
        }

        // Step 2: Test /auth/me with token
        console.log('\n🔒 Step 2: Testing /auth/me with token...');
        
        try {
            const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log('✅ /auth/me successful!');
            console.log('📊 Status:', meResponse.status);
            console.log('👤 User data:', {
                id: meResponse.data.data?._id,
                email: meResponse.data.data?.email,
                firstName: meResponse.data.data?.firstName,
                lastName: meResponse.data.data?.lastName
            });
            
        } catch (error) {
            console.log('❌ /auth/me failed');
            console.log('📊 Status:', error.response?.status || 'No response');
            console.log('📝 Error:', error.response?.data || { message: error.message });
            
            // Additional debugging
            console.log('\n🔍 Debug info:');
            console.log('   Request URL:', `${API_BASE_URL}/auth/me`);
            console.log('   Authorization header:', `Bearer ${token.substring(0, 20)}...`);
            console.log('   Error code:', error.code);
            console.log('   Error message:', error.message);
        }

        // Step 3: Test without token (should fail)
        console.log('\n🚫 Step 3: Testing /auth/me without token (should fail)...');
        try {
            const noTokenResponse = await axios.get(`${API_BASE_URL}/auth/me`);
            console.log('⚠️ Unexpected success without token:', noTokenResponse.status);
        } catch (error) {
            console.log('✅ Correctly rejected without token:', error.response?.status || 'No response');
        }

        // Step 4: Test with invalid token (should fail)
        console.log('\n🚫 Step 4: Testing /auth/me with invalid token (should fail)...');
        try {
            const invalidTokenResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': 'Bearer invalid-token-here'
                }
            });
            console.log('⚠️ Unexpected success with invalid token:', invalidTokenResponse.status);
        } catch (error) {
            console.log('✅ Correctly rejected invalid token:', error.response?.status || 'No response');
        }

    } catch (error) {
        console.log('❌ Registration failed');
        console.log('📊 Status:', error.response?.status || 'No response');
        console.log('📝 Error:', error.response?.data || { message: error.message });
    }
}

// Test all auth endpoints
async function testAllAuthEndpoints() {
    console.log('🧪 Testing All Auth Endpoints\n');
    console.log('='.repeat(50));

    // Test available endpoints
    const endpoints = [
        { method: 'GET', path: '/auth/me', needsAuth: true },
        { method: 'POST', path: '/auth/login', needsAuth: false },
        { method: 'POST', path: '/auth/register', needsAuth: false },
        { method: 'POST', path: '/auth/logout', needsAuth: true },
        { method: 'POST', path: '/auth/refresh-token', needsAuth: false }
    ];

    console.log('📋 Available Auth Endpoints:');
    endpoints.forEach(ep => {
        const authStatus = ep.needsAuth ? '🔒 Protected' : '🌐 Public';
        console.log(`   ${ep.method} ${ep.path} - ${authStatus}`);
    });

    console.log('\n' + '='.repeat(50));
    await testAuthMe();
}

testAllAuthEndpoints().catch(console.error);
