const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function comprehensiveStabilityCheck() {
    console.log('🔍 Comprehensive API Stability Check');
    console.log('🎯 Goal: Verify 100% Production Readiness & Endpoint Stability');
    console.log('=' .repeat(80));
    
    const stabilityResults = {
        timestamp: new Date().toISOString(),
        totalRuns: 3, // Run each test 3 times to check consistency
        categories: {
            authentication: { tests: [], stability: 0, avgResponseTime: 0 },
            products: { tests: [], stability: 0, avgResponseTime: 0 },
            cart: { tests: [], stability: 0, avgResponseTime: 0 },
            orders: { tests: [], stability: 0, avgResponseTime: 0 },
            security: { tests: [], stability: 0, avgResponseTime: 0 }
        },
        overallStability: 0,
        regressionIssues: [],
        productionReady: false
    };

    let authToken = null;
    let testUserId = null;
    let testProductId = null;

    // Helper function to run test multiple times for stability
    async function runStabilityTest(category, testName, testFn, expectedStatus = 200) {
        const results = [];
        let totalTime = 0;
        
        console.log(`\n🧪 Testing: ${testName}`);
        
        for (let run = 1; run <= stabilityResults.totalRuns; run++) {
            try {
                const startTime = Date.now();
                const result = await testFn();
                const duration = Date.now() - startTime;
                totalTime += duration;
                
                const success = result.status === expectedStatus;
                results.push({
                    run,
                    success,
                    status: result.status,
                    duration,
                    data: result.data
                });
                
                console.log(`   Run ${run}: ${success ? '✅' : '❌'} ${result.status} (${duration}ms)`);
                
            } catch (error) {
                const duration = Date.now() - startTime;
                totalTime += duration;
                
                const success = error.response?.status === expectedStatus;
                results.push({
                    run,
                    success,
                    status: error.response?.status || 0,
                    duration,
                    error: error.message
                });
                
                console.log(`   Run ${run}: ${success ? '✅' : '❌'} ${error.response?.status || 'ERR'} (${duration}ms)`);
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        const stability = (successCount / stabilityResults.totalRuns) * 100;
        const avgResponseTime = totalTime / stabilityResults.totalRuns;
        
        const testResult = {
            name: testName,
            stability: stability,
            avgResponseTime: avgResponseTime,
            results: results,
            consistent: successCount === stabilityResults.totalRuns
        };
        
        stabilityResults.categories[category].tests.push(testResult);
        
        console.log(`   📊 Stability: ${stability}% | Avg Time: ${avgResponseTime.toFixed(1)}ms | Consistent: ${testResult.consistent ? '✅' : '❌'}`);
        
        return testResult;
    }

    // 1. Authentication Stability Tests
    console.log('\n🔐 Authentication Endpoint Stability Tests');
    console.log('-'.repeat(60));

    await runStabilityTest('authentication', 'Server Health Check', async () => {
        const response = await axios.get(`${API_BASE_URL}/../../health`);
        return { status: response.status, data: response.data };
    });

    const registerTest = await runStabilityTest('authentication', 'User Registration', async () => {
        const userData = {
            firstName: 'Stability',
            lastName: 'Test',
            email: `stability${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
            password: 'StabilityTest123!',
            phone: '+1234567890'
        };
        
        const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
        
        // Store token from first successful registration
        if (!authToken && response.data.data?.token) {
            authToken = response.data.data.token;
            testUserId = response.data.data.user._id;
        }
        
        return { status: response.status, data: response.data };
    }, 201);

    // Use a consistent user for login tests
    const testLoginEmail = 'consistent.test@example.com';
    const testLoginPassword = 'ConsistentTest123!';
    
    // Create consistent test user first
    try {
        await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: 'Consistent',
            lastName: 'User',
            email: testLoginEmail,
            password: testLoginPassword,
            phone: '+1234567890'
        });
    } catch (error) {
        // User might already exist, that's fine
    }

    await runStabilityTest('authentication', 'User Login', async () => {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: testLoginEmail,
            password: testLoginPassword
        });
        
        if (!authToken && response.data.data?.token) {
            authToken = response.data.data.token;
        }
        
        return { status: response.status, data: response.data };
    });

    if (authToken) {
        await runStabilityTest('authentication', 'Get Current User', async () => {
            const response = await axios.get(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            return { status: response.status, data: response.data };
        });
    }

    // 2. Product Catalog Stability Tests
    console.log('\n📦 Product Catalog Endpoint Stability Tests');
    console.log('-'.repeat(60));

    const productsTest = await runStabilityTest('products', 'Get All Products', async () => {
        const response = await axios.get(`${API_BASE_URL}/products`);
        
        if (!testProductId && response.data.data?.length > 0) {
            testProductId = response.data.data[0]._id;
        }
        
        return { status: response.status, data: response.data };
    });

    await runStabilityTest('products', 'Product Search', async () => {
        const response = await axios.get(`${API_BASE_URL}/products/search?q=test`);
        return { status: response.status, data: response.data };
    });

    await runStabilityTest('products', 'Product Pagination', async () => {
        const response = await axios.get(`${API_BASE_URL}/products?page=1&limit=5`);
        return { status: response.status, data: response.data };
    });

    await runStabilityTest('products', 'Get Categories', async () => {
        const response = await axios.get(`${API_BASE_URL}/categories`);
        return { status: response.status, data: response.data };
    });

    await runStabilityTest('products', 'Get Brands', async () => {
        const response = await axios.get(`${API_BASE_URL}/brands`);
        return { status: response.status, data: response.data };
    });

    // 3. Shopping Cart Stability Tests
    console.log('\n🛒 Shopping Cart Endpoint Stability Tests');
    console.log('-'.repeat(60));

    await runStabilityTest('cart', 'Get Cart (Guest)', async () => {
        const response = await axios.get(`${API_BASE_URL}/cart`);
        return { status: response.status, data: response.data };
    });

    if (authToken) {
        await runStabilityTest('cart', 'Get Cart (Authenticated)', async () => {
            const response = await axios.get(`${API_BASE_URL}/cart`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            return { status: response.status, data: response.data };
        });

        await runStabilityTest('cart', 'Clear Cart', async () => {
            const response = await axios.delete(`${API_BASE_URL}/cart/clear`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            return { status: response.status, data: response.data };
        });
    }

    // 4. Order Management Stability Tests
    console.log('\n📋 Order Management Endpoint Stability Tests');
    console.log('-'.repeat(60));

    if (authToken) {
        await runStabilityTest('orders', 'Get Order History', async () => {
            const response = await axios.get(`${API_BASE_URL}/orders`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            return { status: response.status, data: response.data };
        });
    }

    // 5. Security Validation Stability Tests
    console.log('\n🔒 Security Validation Endpoint Stability Tests');
    console.log('-'.repeat(60));

    await runStabilityTest('security', 'Reject Access Without Token', async () => {
        try {
            await axios.get(`${API_BASE_URL}/auth/me`);
            throw new Error('Should have failed');
        } catch (error) {
            if (error.response?.status === 401) {
                return { status: 401, data: { securityWorking: true } };
            }
            throw error;
        }
    }, 401);

    await runStabilityTest('security', 'Reject Invalid Token', async () => {
        try {
            await axios.get(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: 'Bearer invalid-token' }
            });
            throw new Error('Should have failed');
        } catch (error) {
            if (error.response?.status === 401) {
                return { status: 401, data: { securityWorking: true } };
            }
            throw error;
        }
    }, 401);

    // Calculate overall stability metrics
    let totalTests = 0;
    let totalStableTests = 0;
    let totalResponseTime = 0;

    Object.keys(stabilityResults.categories).forEach(category => {
        const categoryData = stabilityResults.categories[category];
        const categoryTests = categoryData.tests;
        
        if (categoryTests.length > 0) {
            const categoryStability = categoryTests.reduce((sum, test) => sum + test.stability, 0) / categoryTests.length;
            const categoryAvgTime = categoryTests.reduce((sum, test) => sum + test.avgResponseTime, 0) / categoryTests.length;
            
            categoryData.stability = categoryStability;
            categoryData.avgResponseTime = categoryAvgTime;
            
            totalTests += categoryTests.length;
            totalStableTests += categoryTests.filter(test => test.consistent).length;
            totalResponseTime += categoryAvgTime;
        }
    });

    stabilityResults.overallStability = totalTests > 0 ? (totalStableTests / totalTests) * 100 : 0;
    stabilityResults.productionReady = stabilityResults.overallStability >= 95; // 95% threshold

    // Generate Stability Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE STABILITY REPORT');
    console.log('='.repeat(80));

    console.log(`\n📈 Overall Stability Metrics:`);
    console.log(`   Overall Stability: ${stabilityResults.overallStability.toFixed(1)}%`);
    console.log(`   Total Endpoint Tests: ${totalTests}`);
    console.log(`   Consistently Stable: ${totalStableTests}/${totalTests}`);
    console.log(`   Production Ready: ${stabilityResults.productionReady ? '✅ YES' : '❌ NO'}`);

    console.log(`\n📋 Stability by Category:`);
    Object.entries(stabilityResults.categories).forEach(([category, data]) => {
        if (data.tests.length > 0) {
            const icon = data.stability >= 95 ? '✅' : data.stability >= 80 ? '⚠️' : '❌';
            console.log(`   ${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${data.stability.toFixed(1)}% (${data.avgResponseTime.toFixed(1)}ms avg)`);
        }
    });

    // Check for regressions
    const unstableTests = [];
    Object.values(stabilityResults.categories).forEach(category => {
        category.tests.forEach(test => {
            if (!test.consistent || test.stability < 100) {
                unstableTests.push({
                    name: test.name,
                    stability: test.stability,
                    issues: test.results.filter(r => !r.success)
                });
            }
        });
    });

    if (unstableTests.length > 0) {
        console.log(`\n⚠️ Potential Stability Issues:`);
        unstableTests.forEach(test => {
            console.log(`   - ${test.name}: ${test.stability}% stable`);
            test.issues.forEach(issue => {
                console.log(`     Run ${issue.run}: ${issue.status} ${issue.error || ''}`);
            });
        });
    } else {
        console.log(`\n✅ No Stability Issues Found - All Endpoints 100% Consistent`);
    }

    // Performance Analysis
    console.log(`\n⚡ Performance Analysis:`);
    const avgResponseTime = totalResponseTime / Object.keys(stabilityResults.categories).length;
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(1)}ms`);
    console.log(`   Performance Status: ${avgResponseTime < 100 ? '✅ Excellent' : avgResponseTime < 500 ? '⚠️ Good' : '❌ Needs Improvement'}`);

    // Final Assessment
    console.log(`\n🎯 Final Assessment:`);
    if (stabilityResults.overallStability >= 95 && avgResponseTime < 100) {
        console.log(`   🎉 API IS PRODUCTION READY!`);
        console.log(`   ✅ High stability (${stabilityResults.overallStability.toFixed(1)}%)`);
        console.log(`   ✅ Excellent performance (${avgResponseTime.toFixed(1)}ms)`);
        console.log(`   ✅ All endpoints functioning consistently`);
        console.log(`   🚀 Ready for frontend integration`);
    } else {
        console.log(`   ⚠️ API needs attention before production`);
        if (stabilityResults.overallStability < 95) {
            console.log(`   - Stability below 95% threshold`);
        }
        if (avgResponseTime >= 100) {
            console.log(`   - Response times above 100ms target`);
        }
    }

    console.log('\n' + '='.repeat(80));

    // Save detailed report
    require('fs').writeFileSync('stability-report.json', JSON.stringify(stabilityResults, null, 2));
    console.log('📄 Detailed stability report saved: stability-report.json');

    return stabilityResults;
}

// Run stability check
comprehensiveStabilityCheck().catch(console.error);
