const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function testProductsEndpointAuthorization() {
    console.log('🔍 Testing GET /api/v1/products Endpoint Authorization');
    console.log('🎯 Goal: Verify that product listing is publicly accessible');
    console.log('=' .repeat(80));
    
    const testResults = {
        timestamp: new Date().toISOString(),
        tests: [],
        summary: {
            total: 0,
            passed: 0,
            failed: 0
        }
    };

    // Helper function to run test
    async function runTest(testName, testFn, expectedStatus = 200) {
        const startTime = Date.now();
        try {
            console.log(`\n🧪 Testing: ${testName}`);
            const result = await testFn();
            const duration = Date.now() - startTime;
            
            const success = result.status === expectedStatus;
            const testResult = {
                name: testName,
                success,
                status: result.status,
                duration,
                expectedStatus,
                dataCount: result.data?.data?.length || 0,
                hasData: !!result.data?.data
            };
            
            testResults.tests.push(testResult);
            testResults.summary.total++;
            
            if (success) {
                testResults.summary.passed++;
                console.log(`   ✅ ${testName}: ${result.status} (${duration}ms) - ${testResult.dataCount} products returned`);
            } else {
                testResults.summary.failed++;
                console.log(`   ❌ ${testName}: ${result.status} (${duration}ms) - Expected: ${expectedStatus}`);
            }
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            const success = error.response?.status === expectedStatus;
            const testResult = {
                name: testName,
                success,
                status: error.response?.status || 0,
                duration,
                error: error.message,
                errorData: error.response?.data,
                expectedStatus
            };
            
            testResults.tests.push(testResult);
            testResults.summary.total++;
            
            if (success) {
                testResults.summary.passed++;
                console.log(`   ✅ ${testName}: ${error.response?.status || 'ERR'} (${duration}ms) - Expected failure`);
            } else {
                testResults.summary.failed++;
                console.log(`   ❌ ${testName}: ${error.response?.status || 'ERR'} (${duration}ms) - Unexpected failure`);
                if (error.response?.data?.error) {
                    console.log(`      Error: ${error.response.data.error}`);
                }
            }
            
            return { status: error.response?.status || 0, data: error.response?.data, error: error.message };
        }
    }

    // Test 1: GET products without any authentication
    console.log('\n📖 Testing Public Access (No Authentication)');
    console.log('-'.repeat(50));

    await runTest('Get Products (No Auth)', async () => {
        const response = await axios.get(`${API_BASE_URL}/products`);
        return { status: response.status, data: response.data };
    });

    await runTest('Get Products with Query Params (No Auth)', async () => {
        const response = await axios.get(`${API_BASE_URL}/products?page=1&limit=5`);
        return { status: response.status, data: response.data };
    });

    await runTest('Get Products Search (No Auth)', async () => {
        const response = await axios.get(`${API_BASE_URL}/products/search?q=test`);
        return { status: response.status, data: response.data };
    });

    await runTest('Get Featured Products (No Auth)', async () => {
        const response = await axios.get(`${API_BASE_URL}/products/featured`);
        return { status: response.status, data: response.data };
    });

    // Test 2: GET products with customer authentication
    console.log('\n👤 Testing Customer Access (With Customer Token)');
    console.log('-'.repeat(50));

    let customerToken = null;
    try {
        // Create a customer user
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: 'Test',
            lastName: 'Customer',
            email: `testcustomer${Date.now()}@example.com`,
            password: 'TestCustomer123!',
            phone: '+1234567890'
        });
        
        customerToken = registerResponse.data.data.token;
        console.log(`✅ Customer token obtained: ${customerToken ? 'YES' : 'NO'}`);
        
    } catch (error) {
        console.log(`❌ Could not create customer user: ${error.message}`);
    }

    if (customerToken) {
        await runTest('Get Products (Customer Auth)', async () => {
            const response = await axios.get(`${API_BASE_URL}/products`, {
                headers: { Authorization: `Bearer ${customerToken}` }
            });
            return { status: response.status, data: response.data };
        });

        await runTest('Get Products with Filters (Customer Auth)', async () => {
            const response = await axios.get(`${API_BASE_URL}/products?isVisible=true&status=active`, {
                headers: { Authorization: `Bearer ${customerToken}` }
            });
            return { status: response.status, data: response.data };
        });
    }

    // Test 3: GET products with admin authentication
    console.log('\n👑 Testing Admin Access (With Admin Token)');
    console.log('-'.repeat(50));

    let adminToken = null;
    try {
        const adminLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@shopdev.com',
            password: 'AdminPassword123!'
        });
        
        adminToken = adminLoginResponse.data.data.token;
        console.log(`✅ Admin token obtained: ${adminToken ? 'YES' : 'NO'}`);
        
    } catch (error) {
        console.log(`❌ Could not login as admin: ${error.message}`);
    }

    if (adminToken) {
        await runTest('Get Products (Admin Auth)', async () => {
            const response = await axios.get(`${API_BASE_URL}/products`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            return { status: response.status, data: response.data };
        });

        await runTest('Get Products with Admin Filters (Admin Auth)', async () => {
            const response = await axios.get(`${API_BASE_URL}/products?status=draft&isVisible=false`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            return { status: response.status, data: response.data };
        });
    }

    // Test 4: Test individual product access
    console.log('\n🔍 Testing Individual Product Access');
    console.log('-'.repeat(50));

    // First get a product ID
    let testProductId = null;
    try {
        const productsResponse = await axios.get(`${API_BASE_URL}/products`);
        if (productsResponse.data.data && productsResponse.data.data.length > 0) {
            testProductId = productsResponse.data.data[0]._id;
            console.log(`✅ Test product ID obtained: ${testProductId}`);
        }
    } catch (error) {
        console.log(`❌ Could not get product ID: ${error.message}`);
    }

    if (testProductId) {
        await runTest('Get Product by ID (No Auth)', async () => {
            const response = await axios.get(`${API_BASE_URL}/products/${testProductId}`);
            return { status: response.status, data: response.data };
        });

        if (customerToken) {
            await runTest('Get Product by ID (Customer Auth)', async () => {
                const response = await axios.get(`${API_BASE_URL}/products/${testProductId}`, {
                    headers: { Authorization: `Bearer ${customerToken}` }
                });
                return { status: response.status, data: response.data };
            });
        }
    }

    // Test 5: Test invalid requests
    console.log('\n❌ Testing Invalid Requests');
    console.log('-'.repeat(50));

    await runTest('Get Product with Invalid ID', async () => {
        const response = await axios.get(`${API_BASE_URL}/products/invalid-id`);
        return { status: response.status, data: response.data };
    }, 400);

    await runTest('Get Product with Non-existent ID', async () => {
        const response = await axios.get(`${API_BASE_URL}/products/507f1f77bcf86cd799439999`);
        return { status: response.status, data: response.data };
    }, 404);

    // Generate Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 PRODUCTS ENDPOINT AUTHORIZATION TEST RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${testResults.summary.total}`);
    console.log(`   Passed: ${testResults.summary.passed}`);
    console.log(`   Failed: ${testResults.summary.failed}`);
    console.log(`   Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);

    console.log(`\n📋 Test Details:`);
    testResults.tests.forEach(test => {
        const icon = test.success ? '✅' : '❌';
        const statusInfo = test.status ? `${test.status}` : 'ERR';
        const dataInfo = test.dataCount !== undefined ? ` (${test.dataCount} items)` : '';
        console.log(`   ${icon} ${test.name}: ${statusInfo} (${test.duration}ms)${dataInfo}`);
    });

    // Analysis
    console.log(`\n🔍 Analysis:`);
    const publicTests = testResults.tests.filter(test => test.name.includes('No Auth'));
    const publicPassed = publicTests.filter(test => test.success).length;
    
    if (publicPassed === publicTests.length) {
        console.log(`   ✅ All public endpoints are working correctly`);
        console.log(`   ✅ No authentication required for product listing`);
        console.log(`   ✅ Product endpoints are publicly accessible as expected`);
    } else {
        console.log(`   ❌ Some public endpoints are not working correctly`);
        console.log(`   ⚠️ There may be authorization issues with public access`);
    }

    const authTests = testResults.tests.filter(test => test.name.includes('Auth') && !test.name.includes('No Auth'));
    const authPassed = authTests.filter(test => test.success).length;
    
    if (authPassed === authTests.length) {
        console.log(`   ✅ Authenticated access is working correctly`);
        console.log(`   ✅ No conflicts between public and authenticated access`);
    } else if (authTests.length > 0) {
        console.log(`   ⚠️ Some authenticated requests may have issues`);
    }

    console.log(`\n💡 Recommendations:`);
    if (testResults.summary.failed === 0) {
        console.log(`   🎉 All tests passed! The GET /products endpoint is working perfectly`);
        console.log(`   ✅ Public access is properly configured`);
        console.log(`   ✅ No authorization conflicts detected`);
        console.log(`   ✅ Ready for frontend integration`);
    } else {
        console.log(`   🔧 ${testResults.summary.failed} test(s) failed - review the details above`);
        console.log(`   📝 Check server logs for additional error information`);
    }

    console.log('\n' + '='.repeat(80));

    // Save detailed report
    require('fs').writeFileSync('products-endpoint-authorization-report.json', JSON.stringify(testResults, null, 2));
    console.log('📄 Detailed report saved: products-endpoint-authorization-report.json');

    return testResults;
}

// Run the test
testProductsEndpointAuthorization().catch(console.error);
