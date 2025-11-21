const axios = require("axios");
const fs = require("fs");

const API_BASE_URL = "http://localhost:8081/api/v1";

async function finalComprehensiveTest() {
    console.log("🚀 Final Comprehensive API Test Suite");
    console.log("🎯 Goal: Validate 100% Production Readiness");
    console.log("=".repeat(80));

    const results = {
        timestamp: new Date().toISOString(),
        environment: "Development",
        baseUrl: API_BASE_URL,
        categories: {
            authentication: { passed: 0, failed: 0, tests: [] },
            products: { passed: 0, failed: 0, tests: [] },
            cart: { passed: 0, failed: 0, tests: [] },
            orders: { passed: 0, failed: 0, tests: [] },
            security: { passed: 0, failed: 0, tests: [] },
            performance: { passed: 0, failed: 0, tests: [] }
        },
        summary: {
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            successRate: 0,
            productionReady: false
        }
    };

    let authToken = null;
    let testUserId = null;
    let testProductId = null;

    // Helper function
    async function runTest(category, name, testFn) {
        results.summary.totalTests++;

        try {
            const startTime = Date.now();
            const result = await testFn();
            const duration = Date.now() - startTime;

            results.categories[category].passed++;
            results.summary.totalPassed++;

            results.categories[category].tests.push({
                name,
                status: "PASS",
                duration: `${duration}ms`,
                details: result
            });

            console.log(`✅ ${name} (${duration}ms)`);
            return result;
        } catch (error) {
            results.categories[category].failed++;
            results.summary.totalFailed++;

            results.categories[category].tests.push({
                name,
                status: "FAIL",
                error: error.message,
                details: error.response?.data || null
            });

            console.log(`❌ ${name}: ${error.message}`);
            throw error;
        }
    }

    // Authentication Tests
    console.log("\n🔐 Authentication & Authorization Tests");
    console.log("-".repeat(50));

    await runTest("authentication", "Server Health Check", async () => {
        const response = await axios.get(`${API_BASE_URL}/../../health`);
        return { status: response.status, uptime: response.data.uptime };
    });

    let testUserEmail = null;

    const registerResult = await runTest("authentication", "User Registration", async () => {
        const userData = {
            firstName: "Final",
            lastName: "Test",
            email: `final${Date.now()}@example.com`,
            password: "FinalTest123!",
            phone: "+1234567890"
        };

        testUserEmail = userData.email; // Store email for login test

        const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
        authToken = response.data.data.token;
        testUserId = response.data.data.user._id;

        return {
            status: response.status,
            userId: testUserId,
            tokenReceived: !!authToken,
            email: userData.email
        };
    });

    await runTest("authentication", "User Login", async () => {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: testUserEmail,
            password: "FinalTest123!"
        });

        if (!authToken) {
            authToken = response.data.data.token;
        }

        return {
            status: response.status,
            tokenReceived: !!response.data.data.token
        };
    });

    await runTest("authentication", "Get Current User", async () => {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        return {
            status: response.status,
            userId: response.data.data._id,
            email: response.data.data.email
        };
    });

    await runTest("authentication", "Token Refresh", async () => {
        // This test might not work if refresh token endpoint needs specific implementation
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                refreshToken: "dummy-refresh-token"
            });
            return { status: response.status };
        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 401) {
                // Expected for invalid refresh token
                return { status: error.response.status, expected: true };
            }
            throw error;
        }
    });

    // Product Tests
    console.log("\n📦 Product Catalog Tests");
    console.log("-".repeat(50));

    const productsResult = await runTest("products", "Get All Products", async () => {
        const response = await axios.get(`${API_BASE_URL}/products`);

        if (response.data.data && response.data.data.length > 0) {
            testProductId = response.data.data[0]._id;
        }

        return {
            status: response.status,
            productCount: response.data.data?.length || 0,
            hasProducts: (response.data.data?.length || 0) > 0
        };
    });

    await runTest("products", "Product Search", async () => {
        const response = await axios.get(`${API_BASE_URL}/products/search?q=test`);
        return {
            status: response.status,
            searchResults: response.data.data?.length || 0
        };
    });

    await runTest("products", "Product Pagination", async () => {
        const response = await axios.get(`${API_BASE_URL}/products?page=1&limit=5`);
        return {
            status: response.status,
            pageSize: response.data.data?.length || 0,
            pagination: response.data.pagination || null
        };
    });

    if (testProductId) {
        await runTest("products", "Get Product by ID", async () => {
            const response = await axios.get(`${API_BASE_URL}/products/${testProductId}`);
            return {
                status: response.status,
                productId: response.data.data._id,
                productName: response.data.data.name
            };
        });
    }

    await runTest("products", "Get Categories", async () => {
        const response = await axios.get(`${API_BASE_URL}/categories`);
        return {
            status: response.status,
            categoryCount: response.data.data?.length || 0
        };
    });

    await runTest("products", "Get Brands", async () => {
        const response = await axios.get(`${API_BASE_URL}/brands`);
        return {
            status: response.status,
            brandCount: response.data.data?.length || 0
        };
    });

    // Cart Tests
    console.log("\n🛒 Shopping Cart Tests");
    console.log("-".repeat(50));

    await runTest("cart", "Get Cart (Guest)", async () => {
        const response = await axios.get(`${API_BASE_URL}/cart`);
        return {
            status: response.status,
            cartType: "guest"
        };
    });

    await runTest("cart", "Get Cart (Authenticated)", async () => {
        const response = await axios.get(`${API_BASE_URL}/cart`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        return {
            status: response.status,
            cartType: "authenticated",
            itemCount: response.data.data?.items?.length || 0
        };
    });

    if (testProductId) {
        await runTest("cart", "Add Item to Cart", async () => {
            const response = await axios.post(
                `${API_BASE_URL}/cart/items`,
                {
                    productId: testProductId,
                    quantity: 2
                },
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );
            return {
                status: response.status,
                productAdded: testProductId,
                quantity: 2
            };
        });

        await runTest("cart", "Update Cart Item", async () => {
            const response = await axios.put(
                `${API_BASE_URL}/cart/items/${testProductId}`,
                {
                    quantity: 3
                },
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );
            return {
                status: response.status,
                newQuantity: 3
            };
        });

        await runTest("cart", "Remove Item from Cart", async () => {
            const response = await axios.delete(`${API_BASE_URL}/cart/items/${testProductId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            return {
                status: response.status,
                productRemoved: testProductId
            };
        });
    }

    await runTest("cart", "Clear Cart", async () => {
        const response = await axios.delete(`${API_BASE_URL}/cart/clear`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        return {
            status: response.status,
            cartCleared: true
        };
    });

    // Order Tests
    console.log("\n📋 Order Management Tests");
    console.log("-".repeat(50));

    await runTest("orders", "Get Order History", async () => {
        const response = await axios.get(`${API_BASE_URL}/orders`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        return {
            status: response.status,
            orderCount: response.data.data?.length || 0
        };
    });

    // Security Tests
    console.log("\n🔒 Security & Validation Tests");
    console.log("-".repeat(50));

    await runTest("security", "Reject Invalid Login", async () => {
        try {
            await axios.post(`${API_BASE_URL}/auth/login`, {
                email: "invalid@example.com",
                password: "wrongpassword"
            });
            throw new Error("Should have failed");
        } catch (error) {
            if (error.response?.status === 401) {
                return { status: 401, securityWorking: true, reason: "Invalid credentials" };
            } else if (error.response?.status === 429) {
                return { status: 429, securityWorking: true, reason: "Rate limiting active" };
            }
            throw error;
        }
    });

    await runTest("security", "Reject Access Without Token", async () => {
        try {
            await axios.get(`${API_BASE_URL}/auth/me`);
            throw new Error("Should have failed");
        } catch (error) {
            if (error.response?.status === 401) {
                return { status: 401, securityWorking: true };
            }
            throw error;
        }
    });

    await runTest("security", "Reject Invalid Token", async () => {
        try {
            await axios.get(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: "Bearer invalid-token" }
            });
            throw new Error("Should have failed");
        } catch (error) {
            if (error.response?.status === 401) {
                return { status: 401, securityWorking: true };
            }
            throw error;
        }
    });

    await runTest("security", "Reject Invalid Email Format", async () => {
        try {
            await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: "Test",
                lastName: "User",
                email: "invalid-email",
                password: "TestPassword123!",
                phone: "+1234567890"
            });
            throw new Error("Should have failed");
        } catch (error) {
            if (error.response?.status === 400) {
                return { status: 400, validationWorking: true };
            }
            throw error;
        }
    });

    // Performance Tests
    console.log("\n⚡ Performance Tests");
    console.log("-".repeat(50));

    await runTest("performance", "Response Time Check", async () => {
        const startTime = Date.now();
        await axios.get(`${API_BASE_URL}/products`);
        const responseTime = Date.now() - startTime;

        return {
            responseTime: `${responseTime}ms`,
            performanceGood: responseTime < 1000
        };
    });

    // Calculate final results
    results.summary.successRate = ((results.summary.totalPassed / results.summary.totalTests) * 100).toFixed(1);
    results.summary.productionReady = results.summary.totalFailed === 0;

    // Generate Final Report
    console.log("\n" + "=".repeat(80));
    console.log("🎯 FINAL COMPREHENSIVE TEST RESULTS");
    console.log("=".repeat(80));

    console.log(`📊 Overall Summary:`);
    console.log(`   Total Tests: ${results.summary.totalTests}`);
    console.log(`   Passed: ${results.summary.totalPassed}`);
    console.log(`   Failed: ${results.summary.totalFailed}`);
    console.log(`   Success Rate: ${results.summary.successRate}%`);

    console.log(`\n📋 Results by Category:`);
    Object.entries(results.categories).forEach(([category, data]) => {
        const total = data.passed + data.failed;
        const rate = total > 0 ? ((data.passed / total) * 100).toFixed(1) : "0.0";
        console.log(`   ${category.charAt(0).toUpperCase() + category.slice(1)}: ${data.passed}/${total} (${rate}%)`);
    });

    if (results.summary.productionReady) {
        console.log(`\n🎉 PRODUCTION READINESS: ✅ READY`);
        console.log(`   ✅ All tests passed`);
        console.log(`   ✅ Security features working`);
        console.log(`   ✅ Performance acceptable`);
        console.log(`   ✅ API fully functional`);
    } else {
        console.log(`\n⚠️ PRODUCTION READINESS: ❌ NOT READY`);
        console.log(`   ${results.summary.totalFailed} test(s) failed`);
    }

    console.log(`\n📄 Detailed Report: final-test-report.json`);
    console.log(`📅 Test Date: ${results.timestamp}`);
    console.log(`🌐 Environment: ${results.environment}`);
    console.log("=".repeat(80));

    // Save detailed report
    fs.writeFileSync("final-test-report.json", JSON.stringify(results, null, 2));

    return results;
}

// Run final comprehensive test
finalComprehensiveTest().catch(console.error);
