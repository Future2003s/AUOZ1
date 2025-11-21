const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function quickAPITest() {
    console.log('🧪 Quick API Testing Suite');
    console.log('=' .repeat(50));
    
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        tests: []
    };

    // Helper function to test an endpoint
    async function testEndpoint(name, method, endpoint, data = null, headers = {}) {
        results.total++;
        
        try {
            const config = {
                method,
                url: `${API_BASE_URL}${endpoint}`,
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };
            
            if (data) {
                config.data = data;
            }
            
            const response = await axios(config);
            
            results.passed++;
            results.tests.push({
                name,
                status: 'PASS',
                code: response.status,
                message: `${method} ${endpoint} - Success`
            });
            
            console.log(`✅ ${name}: ${response.status} - Success`);
            return { success: true, data: response.data, status: response.status };
            
        } catch (error) {
            results.failed++;
            const status = error.response?.status || 0;
            const message = error.response?.data?.message || error.message;
            
            results.tests.push({
                name,
                status: 'FAIL',
                code: status,
                message: `${method} ${endpoint} - ${message}`
            });
            
            console.log(`❌ ${name}: ${status} - ${message}`);
            return { success: false, error: message, status };
        }
    }

    // Check if server is running
    console.log('\n🏥 Checking Server Health...');
    const healthCheck = await testEndpoint('Server Health', 'GET', '/../../health');
    
    if (!healthCheck.success) {
        console.log('\n❌ Server is not running. Please start the server first.');
        console.log('   Run: npm run dev');
        return;
    }

    // Test Authentication APIs
    console.log('\n🔐 Testing Authentication APIs...');
    
    let authToken = null;
    let userId = null;
    
    // Test Registration
    const registerData = {
        firstName: 'Test',
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        phone: '+1234567890'
    };
    
    const registerResult = await testEndpoint('User Registration', 'POST', '/auth/register', registerData);
    
    if (registerResult.success) {
        authToken = registerResult.data.data?.token;
        userId = registerResult.data.data?.user?._id;
    }
    
    // Test Login
    const loginResult = await testEndpoint('User Login', 'POST', '/auth/login', {
        email: registerData.email,
        password: registerData.password
    });
    
    if (loginResult.success && !authToken) {
        authToken = loginResult.data.data?.token;
        userId = loginResult.data.data?.user?._id;
    }
    
    // Test Invalid Login
    await testEndpoint('Invalid Login (Expected Fail)', 'POST', '/auth/login', {
        email: 'invalid@example.com',
        password: 'wrongpassword'
    });
    
    // Test Protected Route
    if (authToken) {
        await testEndpoint('Get Current User', 'GET', '/auth/me', null, {
            'Authorization': `Bearer ${authToken}`
        });
    }
    
    // Test Product APIs
    console.log('\n📦 Testing Product APIs...');
    
    const productsResult = await testEndpoint('Get All Products', 'GET', '/products');
    let productId = null;
    
    if (productsResult.success && productsResult.data.data?.length > 0) {
        productId = productsResult.data.data[0]._id;
        
        await testEndpoint('Get Product by ID', 'GET', `/products/${productId}`);
    }
    
    await testEndpoint('Search Products', 'GET', '/products/search?q=test');
    await testEndpoint('Get Products with Pagination', 'GET', '/products?page=1&limit=5');
    
    // Test Category and Brand APIs
    console.log('\n🏷️ Testing Category & Brand APIs...');
    
    await testEndpoint('Get Categories', 'GET', '/categories');
    await testEndpoint('Get Brands', 'GET', '/brands');
    
    // Test Cart APIs (requires auth)
    if (authToken) {
        console.log('\n🛒 Testing Cart APIs...');
        
        await testEndpoint('Get Cart', 'GET', '/cart', null, {
            'Authorization': `Bearer ${authToken}`
        });
        
        if (productId) {
            await testEndpoint('Add Item to Cart', 'POST', '/cart/add', {
                productId: productId,
                quantity: 2
            }, {
                'Authorization': `Bearer ${authToken}`
            });
            
            await testEndpoint('Update Cart Item', 'PUT', '/cart/update', {
                productId: productId,
                quantity: 3
            }, {
                'Authorization': `Bearer ${authToken}`
            });
            
            await testEndpoint('Remove Item from Cart', 'DELETE', `/cart/remove/${productId}`, null, {
                'Authorization': `Bearer ${authToken}`
            });
        }
        
        await testEndpoint('Clear Cart', 'DELETE', '/cart/clear', null, {
            'Authorization': `Bearer ${authToken}`
        });
    }
    
    // Test Order APIs (requires auth)
    if (authToken) {
        console.log('\n📋 Testing Order APIs...');
        
        await testEndpoint('Get Order History', 'GET', '/orders', null, {
            'Authorization': `Bearer ${authToken}`
        });
    }
    
    // Test Security
    console.log('\n🔒 Testing Security...');
    
    await testEndpoint('Access Protected Route Without Token', 'GET', '/auth/me');
    await testEndpoint('Access with Invalid Token', 'GET', '/auth/me', null, {
        'Authorization': 'Bearer invalid-token'
    });
    
    // Test Input Validation
    await testEndpoint('Invalid Email Registration', 'POST', '/auth/register', {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'password123'
    });
    
    // Generate Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 API Testing Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    
    // Show failed tests
    const failedTests = results.tests.filter(t => t.status === 'FAIL');
    if (failedTests.length > 0) {
        console.log('\n❌ Failed Tests:');
        failedTests.forEach(test => {
            console.log(`   - ${test.name}: ${test.message}`);
        });
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (results.passed === results.total) {
        console.log('   ✅ All tests passed! API is ready for frontend integration.');
    } else {
        console.log('   🔧 Review failed endpoints before frontend integration.');
        console.log('   📝 Check server logs for detailed error information.');
        console.log('   🔍 Verify database connection and data seeding.');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Fix any failed endpoints');
    console.log('   2. Run comprehensive test suite: node run-api-tests.js');
    console.log('   3. Import postman-collection.json for detailed testing');
    console.log('   4. Set up automated testing in CI/CD pipeline');
    
    console.log('\n' + '='.repeat(50));
}

// Run the quick test
quickAPITest().catch(console.error);
