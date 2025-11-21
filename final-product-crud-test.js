const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function finalProductCRUDTest() {
    console.log('🛍️ Final Product CRUD Operations Test');
    console.log('🎯 Goal: Complete CRUD testing with admin user');
    console.log('=' .repeat(80));
    
    const testResults = {
        timestamp: new Date().toISOString(),
        operations: {
            create: { status: 'unknown', tests: [], endpoint: 'POST /products' },
            read: { status: 'unknown', tests: [], endpoint: 'GET /products' },
            readById: { status: 'unknown', tests: [], endpoint: 'GET /products/:id' },
            update: { status: 'unknown', tests: [], endpoint: 'PUT /products/:id' },
            delete: { status: 'unknown', tests: [], endpoint: 'DELETE /products/:id' }
        },
        overallStatus: 'unknown',
        createdProductIds: []
    };

    let adminToken = null;
    let sellerToken = null;
    let testProductId = null;
    let testCategoryId = null;
    let testBrandId = null;

    // Helper function to run CRUD test
    async function runCRUDTest(operation, testName, testFn, expectedStatus = 200) {
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
                data: result.data,
                expectedStatus
            };
            
            testResults.operations[operation].tests.push(testResult);
            console.log(`   ${success ? '✅' : '❌'} ${testName}: ${result.status} (${duration}ms) ${success ? 'SUCCESS' : 'FAILED'}`);
            
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
            
            testResults.operations[operation].tests.push(testResult);
            console.log(`   ${success ? '✅' : '❌'} ${testName}: ${error.response?.status || 'ERR'} (${duration}ms) ${success ? 'EXPECTED FAIL' : 'UNEXPECTED FAIL'}`);
            
            if (!success && error.response?.data?.error) {
                console.log(`      Error: ${error.response.data.error}`);
            }
            
            return { status: error.response?.status || 0, data: error.response?.data, error: error.message };
        }
    }

    // Setup: Login as admin
    console.log('\n🔐 Setup: Admin Authentication');
    console.log('-'.repeat(50));
    
    try {
        const adminLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@shopdev.com',
            password: 'AdminPassword123!'
        });
        
        adminToken = adminLoginResponse.data.data.token;
        console.log(`✅ Admin login successful: ${adminToken ? 'YES' : 'NO'}`);
        
    } catch (error) {
        console.log(`❌ Admin login failed: ${error.message}`);
        return;
    }

    // Setup: Login as seller
    try {
        const sellerLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'seller@shopdev.com',
            password: 'SellerPassword123!'
        });
        
        sellerToken = sellerLoginResponse.data.data.token;
        console.log(`✅ Seller login successful: ${sellerToken ? 'YES' : 'NO'}`);
        
    } catch (error) {
        console.log(`⚠️ Seller login failed: ${error.message}`);
    }

    // Setup: Get test category and brand IDs
    try {
        const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`);
        if (categoriesResponse.data.data && categoriesResponse.data.data.length > 0) {
            testCategoryId = categoriesResponse.data.data[0]._id;
            console.log(`✅ Test category ID: ${testCategoryId}`);
        }
        
        const brandsResponse = await axios.get(`${API_BASE_URL}/brands`);
        if (brandsResponse.data.data && brandsResponse.data.data.length > 0) {
            testBrandId = brandsResponse.data.data[0]._id;
            console.log(`✅ Test brand ID: ${testBrandId}`);
        }
    } catch (error) {
        console.log(`⚠️ Could not get category/brand IDs: ${error.message}`);
    }

    // Test 1: READ Operations (Public)
    console.log('\n📖 Testing READ Operations');
    console.log('-'.repeat(50));

    const readAllResult = await runCRUDTest('read', 'Get All Products', async () => {
        const response = await axios.get(`${API_BASE_URL}/products`);
        
        // Store a product ID for later tests
        if (response.data.data && response.data.data.length > 0) {
            testProductId = response.data.data[0]._id;
        }
        
        return { status: response.status, data: response.data };
    });

    // Test 2: CREATE Operations (Admin)
    console.log('\n➕ Testing CREATE Operations');
    console.log('-'.repeat(50));

    const validProductData = {
        name: 'Test Product CRUD Final',
        description: 'This is a comprehensive test product for final CRUD validation',
        price: 299.99,
        sku: `TEST-FINAL-${Date.now()}`,
        category: testCategoryId || '507f1f77bcf86cd799439011',
        quantity: 75,
        brand: testBrandId || '507f1f77bcf86cd799439012',
        comparePrice: 349.99,
        salePrice: 279.99,
        images: ['https://example.com/test-product.jpg'],
        features: ['High Quality', 'Durable', 'Tested'],
        specifications: {
            weight: '1kg',
            dimensions: '10x10x5cm',
            warranty: '1 year'
        }
    };

    // Test CREATE without authentication
    await runCRUDTest('create', 'Create Product (No Auth)', async () => {
        const response = await axios.post(`${API_BASE_URL}/products`, validProductData);
        return { status: response.status, data: response.data };
    }, 401);

    // Test CREATE with admin
    const createResult = await runCRUDTest('create', 'Create Product (Admin)', async () => {
        const response = await axios.post(`${API_BASE_URL}/products`, validProductData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (response.data.data && response.data.data._id) {
            testProductId = response.data.data._id;
            testResults.createdProductIds.push(testProductId);
        }
        
        return { status: response.status, data: response.data };
    }, 201);

    // Test CREATE with seller
    if (sellerToken) {
        const sellerProductData = {
            ...validProductData,
            name: 'Test Product CRUD Seller',
            sku: `TEST-SELLER-${Date.now()}`
        };
        
        await runCRUDTest('create', 'Create Product (Seller)', async () => {
            const response = await axios.post(`${API_BASE_URL}/products`, sellerProductData, {
                headers: { Authorization: `Bearer ${sellerToken}` }
            });
            
            if (response.data.data && response.data.data._id) {
                testResults.createdProductIds.push(response.data.data._id);
            }
            
            return { status: response.status, data: response.data };
        }, 201);
    }

    // Test CREATE with invalid data
    await runCRUDTest('create', 'Create Product (Invalid Data)', async () => {
        const invalidData = {
            name: '', // Invalid: empty name
            price: -10, // Invalid: negative price
            sku: '' // Invalid: empty SKU
        };
        
        const response = await axios.post(`${API_BASE_URL}/products`, invalidData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        return { status: response.status, data: response.data };
    }, 400);

    // Test 3: READ by ID Operations
    console.log('\n📖 Testing READ by ID Operations');
    console.log('-'.repeat(50));

    if (testProductId) {
        await runCRUDTest('readById', 'Get Product by ID', async () => {
            const response = await axios.get(`${API_BASE_URL}/products/${testProductId}`);
            return { status: response.status, data: response.data };
        });

        await runCRUDTest('readById', 'Get Product by Invalid ID', async () => {
            const response = await axios.get(`${API_BASE_URL}/products/invalid-id`);
            return { status: response.status, data: response.data };
        }, 400);

        await runCRUDTest('readById', 'Get Product by Non-existent ID', async () => {
            const response = await axios.get(`${API_BASE_URL}/products/507f1f77bcf86cd799439999`);
            return { status: response.status, data: response.data };
        }, 404);
    }

    // Test 4: UPDATE Operations
    console.log('\n✏️ Testing UPDATE Operations');
    console.log('-'.repeat(50));

    if (testProductId) {
        const updateData = {
            name: 'Updated Test Product CRUD Final',
            description: 'This product has been updated via comprehensive CRUD test',
            price: 399.99,
            quantity: 50
        };

        // Test UPDATE without authentication
        await runCRUDTest('update', 'Update Product (No Auth)', async () => {
            const response = await axios.put(`${API_BASE_URL}/products/${testProductId}`, updateData);
            return { status: response.status, data: response.data };
        }, 401);

        // Test UPDATE with admin
        await runCRUDTest('update', 'Update Product (Admin)', async () => {
            const response = await axios.put(`${API_BASE_URL}/products/${testProductId}`, updateData, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            return { status: response.status, data: response.data };
        });

        // Test UPDATE with seller
        if (sellerToken) {
            await runCRUDTest('update', 'Update Product (Seller)', async () => {
                const response = await axios.put(`${API_BASE_URL}/products/${testProductId}`, {
                    ...updateData,
                    name: 'Updated by Seller'
                }, {
                    headers: { Authorization: `Bearer ${sellerToken}` }
                });
                return { status: response.status, data: response.data };
            });
        }

        // Test UPDATE with invalid ID
        await runCRUDTest('update', 'Update Product (Invalid ID)', async () => {
            const response = await axios.put(`${API_BASE_URL}/products/invalid-id`, updateData, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            return { status: response.status, data: response.data };
        }, 400);
    }

    // Test 5: DELETE Operations
    console.log('\n🗑️ Testing DELETE Operations');
    console.log('-'.repeat(50));

    if (testResults.createdProductIds.length > 0) {
        const productToDelete = testResults.createdProductIds[0];

        // Test DELETE without authentication
        await runCRUDTest('delete', 'Delete Product (No Auth)', async () => {
            const response = await axios.delete(`${API_BASE_URL}/products/${productToDelete}`);
            return { status: response.status, data: response.data };
        }, 401);

        // Test DELETE with admin
        await runCRUDTest('delete', 'Delete Product (Admin)', async () => {
            const response = await axios.delete(`${API_BASE_URL}/products/${productToDelete}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            return { status: response.status, data: response.data };
        });

        // Test DELETE with invalid ID
        await runCRUDTest('delete', 'Delete Product (Invalid ID)', async () => {
            const response = await axios.delete(`${API_BASE_URL}/products/invalid-id`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            return { status: response.status, data: response.data };
        }, 400);

        // Test DELETE with non-existent ID
        await runCRUDTest('delete', 'Delete Product (Non-existent ID)', async () => {
            const response = await axios.delete(`${API_BASE_URL}/products/507f1f77bcf86cd799439999`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            return { status: response.status, data: response.data };
        }, 404);
    }

    // Calculate results
    Object.keys(testResults.operations).forEach(operation => {
        const tests = testResults.operations[operation].tests;
        const successCount = tests.filter(test => test.success).length;
        const totalCount = tests.length;
        
        if (totalCount > 0) {
            testResults.operations[operation].status = successCount === totalCount ? 'PASS' : 'PARTIAL';
            testResults.operations[operation].successRate = ((successCount / totalCount) * 100).toFixed(1);
        } else {
            testResults.operations[operation].status = 'NOT_TESTED';
        }
    });

    // Determine overall status
    const operationStatuses = Object.values(testResults.operations).map(op => op.status);
    const allPass = operationStatuses.every(status => status === 'PASS');
    const anyNotTested = operationStatuses.some(status => status === 'NOT_TESTED');
    
    testResults.overallStatus = allPass ? 'PASS' : anyNotTested ? 'INCOMPLETE' : 'PARTIAL';

    // Generate Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL PRODUCT CRUD TEST RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📈 Overall Status: ${testResults.overallStatus}`);
    
    console.log(`\n📋 Operation Results:`);
    Object.entries(testResults.operations).forEach(([operation, data]) => {
        const icon = data.status === 'PASS' ? '✅' : data.status === 'PARTIAL' ? '⚠️' : '❌';
        const rate = data.successRate || '0.0';
        console.log(`   ${icon} ${operation.toUpperCase()}: ${data.status} (${rate}%) - ${data.endpoint}`);
        
        if (data.tests.length > 0) {
            data.tests.forEach(test => {
                const testIcon = test.success ? '✅' : '❌';
                console.log(`      ${testIcon} ${test.name}: ${test.status} (${test.duration}ms)`);
            });
        }
    });

    console.log(`\n🎯 Summary:`);
    const totalTests = Object.values(testResults.operations).reduce((sum, op) => sum + op.tests.length, 0);
    const passedTests = Object.values(testResults.operations).reduce((sum, op) => sum + op.tests.filter(t => t.success).length, 0);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed Tests: ${passedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Products Created: ${testResults.createdProductIds.length}`);

    if (testResults.overallStatus === 'PASS') {
        console.log(`\n🎉 ALL PRODUCT CRUD OPERATIONS WORKING PERFECTLY!`);
        console.log(`   ✅ Complete CRUD functionality verified`);
        console.log(`   ✅ Proper authentication and authorization`);
        console.log(`   ✅ Error handling working correctly`);
        console.log(`   ✅ Ready for production use`);
    }

    console.log('\n' + '='.repeat(80));

    // Save detailed report
    require('fs').writeFileSync('final-product-crud-report.json', JSON.stringify(testResults, null, 2));
    console.log('📄 Detailed final CRUD report saved: final-product-crud-report.json');

    return testResults;
}

// Run final product CRUD test
finalProductCRUDTest().catch(console.error);
