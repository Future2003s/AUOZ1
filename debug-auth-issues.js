const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function debugAuthenticationIssues() {
    console.log('🔍 Debugging Authentication Issues');
    console.log('=' .repeat(60));
    
    // Test data
    const testUser = {
        firstName: 'Debug',
        lastName: 'User',
        email: `debug${Date.now()}@example.com`,
        password: 'DebugPassword123!',
        phone: '+1234567890'
    };

    console.log('📝 Test User Data:');
    console.log(JSON.stringify(testUser, null, 2));
    console.log('');

    // Test 1: Check server health
    console.log('🏥 Step 1: Checking Server Health...');
    try {
        const healthResponse = await axios.get(`${API_BASE_URL}/../../health`, { timeout: 5000 });
        console.log('✅ Server is healthy:', healthResponse.status);
        console.log('📊 Health data:', healthResponse.data);
    } catch (error) {
        console.log('❌ Server health check failed:', error.message);
        return;
    }

    // Test 2: Detailed registration attempt
    console.log('\n🔐 Step 2: Testing User Registration...');
    try {
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Registration successful!');
        console.log('📊 Status:', registerResponse.status);
        console.log('📝 Response:', JSON.stringify(registerResponse.data, null, 2));
        
        // Test login with registered user
        await testLogin(testUser.email, testUser.password);
        
    } catch (error) {
        console.log('❌ Registration failed');
        console.log('📊 Status:', error.response?.status || 'No response');
        console.log('📝 Error data:', JSON.stringify(error.response?.data || { message: error.message }, null, 2));
        
        // Try to understand the error
        await analyzeRegistrationError(error, testUser);
    }

    // Test 3: Try login with existing user (if any)
    console.log('\n🔑 Step 3: Testing Login with Existing User...');
    await testExistingUserLogin();

    // Test 4: Check database connectivity (indirect)
    console.log('\n💾 Step 4: Testing Database Connectivity (via Products)...');
    await testDatabaseConnectivity();

    // Test 5: Test validation errors
    console.log('\n✅ Step 5: Testing Input Validation...');
    await testInputValidation();

    console.log('\n' + '='.repeat(60));
    console.log('🎯 Debug Summary Complete');
    console.log('Check the detailed output above for specific issues');
    console.log('='.repeat(60));
}

async function testLogin(email, password) {
    console.log('\n🔑 Testing Login...');
    try {
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Login successful!');
        console.log('📊 Status:', loginResponse.status);
        console.log('🔑 Token received:', loginResponse.data.data?.token ? 'Yes' : 'No');
        console.log('🔄 Refresh token:', loginResponse.data.data?.refreshToken ? 'Yes' : 'No');
        
        // Test authenticated endpoint
        if (loginResponse.data.data?.token) {
            await testAuthenticatedEndpoint(loginResponse.data.data.token);
        }
        
    } catch (error) {
        console.log('❌ Login failed');
        console.log('📊 Status:', error.response?.status || 'No response');
        console.log('📝 Error:', JSON.stringify(error.response?.data || { message: error.message }, null, 2));
    }
}

async function analyzeRegistrationError(error, testUser) {
    console.log('\n🔍 Analyzing Registration Error...');
    
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    if (status === 400) {
        console.log('📋 400 Bad Request Analysis:');
        console.log('   Possible causes:');
        console.log('   - Missing required fields');
        console.log('   - Invalid email format');
        console.log('   - Weak password');
        console.log('   - Validation middleware issues');
        console.log('   - Database schema mismatch');
        
        if (errorData?.message) {
            console.log('   Server message:', errorData.message);
        }
        
        if (errorData?.errors) {
            console.log('   Validation errors:', errorData.errors);
        }
    } else if (status === 500) {
        console.log('📋 500 Internal Server Error Analysis:');
        console.log('   Possible causes:');
        console.log('   - Database connection issues');
        console.log('   - bcrypt hashing errors');
        console.log('   - Mongoose schema errors');
        console.log('   - Server configuration issues');
    } else if (!status) {
        console.log('📋 Network Error Analysis:');
        console.log('   Possible causes:');
        console.log('   - Server not running');
        console.log('   - Port not accessible');
        console.log('   - Firewall blocking requests');
        console.log('   - CORS issues');
    }
}

async function testExistingUserLogin() {
    // Try common test credentials
    const commonCredentials = [
        { email: 'adadad@gmail.com', password: 'testpassword123' },
        { email: 'test@example.com', password: 'TestPassword123!' },
        { email: 'admin@example.com', password: 'AdminPassword123!' }
    ];
    
    for (const creds of commonCredentials) {
        console.log(`   Trying: ${creds.email}`);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, creds, {
                timeout: 5000,
                headers: { 'Content-Type': 'application/json' }
            });
            
            console.log(`   ✅ Success with ${creds.email}`);
            console.log(`   📊 Status: ${response.status}`);
            return response.data;
            
        } catch (error) {
            const status = error.response?.status || 0;
            console.log(`   ❌ Failed with ${creds.email}: ${status}`);
        }
    }
    
    console.log('   No existing users found or all login attempts failed');
}

async function testDatabaseConnectivity() {
    try {
        const response = await axios.get(`${API_BASE_URL}/products?limit=1`, { timeout: 5000 });
        console.log('✅ Database connectivity OK (products endpoint works)');
        console.log('📊 Products found:', response.data.data?.length || 0);
        
        if (response.data.data?.length > 0) {
            console.log('📝 Sample product:', {
                id: response.data.data[0]._id,
                name: response.data.data[0].name
            });
        }
    } catch (error) {
        console.log('❌ Database connectivity issues');
        console.log('📊 Status:', error.response?.status || 'No response');
        console.log('📝 This suggests database problems that affect all endpoints');
    }
}

async function testInputValidation() {
    const invalidInputs = [
        {
            name: 'Invalid Email',
            data: {
                firstName: 'Test',
                lastName: 'User',
                email: 'invalid-email',
                password: 'TestPassword123!',
                phone: '+1234567890'
            }
        },
        {
            name: 'Weak Password',
            data: {
                firstName: 'Test',
                lastName: 'User',
                email: 'test@weak.com',
                password: '123',
                phone: '+1234567890'
            }
        },
        {
            name: 'Missing Required Fields',
            data: {
                email: 'test@missing.com',
                password: 'TestPassword123!'
            }
        }
    ];
    
    for (const test of invalidInputs) {
        console.log(`   Testing: ${test.name}`);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, test.data, {
                timeout: 5000,
                headers: { 'Content-Type': 'application/json' }
            });
            
            console.log(`   ⚠️ Unexpected success: ${response.status}`);
            
        } catch (error) {
            const status = error.response?.status || 0;
            const message = error.response?.data?.message || error.message;
            console.log(`   ✅ Correctly rejected: ${status} - ${message}`);
        }
    }
}

async function testAuthenticatedEndpoint(token) {
    console.log('\n🔒 Testing Authenticated Endpoint...');
    try {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            timeout: 5000,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Authenticated endpoint works');
        console.log('📊 Status:', response.status);
        console.log('👤 User data:', {
            id: response.data.data?._id,
            email: response.data.data?.email,
            firstName: response.data.data?.firstName
        });
        
    } catch (error) {
        console.log('❌ Authenticated endpoint failed');
        console.log('📊 Status:', error.response?.status || 'No response');
        console.log('📝 Error:', error.response?.data?.message || error.message);
    }
}

// Run the debug
debugAuthenticationIssues().catch(console.error);
