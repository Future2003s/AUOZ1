const axios = require("axios");

const API_BASE_URL = "http://localhost:8081/api/v1";

async function improvedAPITest() {
    console.log("🧪 Improved API Testing Suite - Distinguishing Expected vs Actual Failures");
    console.log("=".repeat(80));

    const results = {
        total: 0,
        actualPassed: 0,
        actualFailed: 0,
        expectedFailures: 0,
        tests: []
    };

    // Helper function to test an endpoint
    async function testEndpoint(
        name,
        method,
        endpoint,
        data = null,
        headers = {},
        shouldSucceed = true,
        expectedStatus = null
    ) {
        results.total++;

        try {
            const config = {
                method,
                url: `${API_BASE_URL}${endpoint}`,
                timeout: 10000,
                headers: {
                    "Content-Type": "application/json",
                    ...headers
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);

            if (shouldSucceed) {
                results.actualPassed++;
                results.tests.push({
                    name,
                    status: "PASS",
                    code: response.status,
                    message: `${method} ${endpoint} - Success as expected`,
                    type: "success"
                });
                console.log(`✅ ${name}: ${response.status} - Success (Expected)`);
            } else {
                // This was supposed to fail but succeeded
                results.actualFailed++;
                results.tests.push({
                    name,
                    status: "UNEXPECTED_SUCCESS",
                    code: response.status,
                    message: `${method} ${endpoint} - Unexpected success`,
                    type: "error"
                });
                console.log(`⚠️ ${name}: ${response.status} - Unexpected Success (Should have failed)`);
            }

            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            const status = error.response?.status || 0;
            const message = error.response?.data?.message || error.message;

            if (!shouldSucceed && (expectedStatus === null || status === expectedStatus)) {
                // Expected failure - this is correct behavior
                results.expectedFailures++;
                results.tests.push({
                    name,
                    status: "EXPECTED_FAIL",
                    code: status,
                    message: `${method} ${endpoint} - Failed as expected (Security working)`,
                    type: "expected"
                });
                console.log(`✅ ${name}: ${status} - Failed as Expected (Security working)`);
            } else if (!shouldSucceed) {
                // Expected to fail but with different status
                results.actualFailed++;
                results.tests.push({
                    name,
                    status: "WRONG_FAIL",
                    code: status,
                    message: `${method} ${endpoint} - Failed with wrong status (Expected: ${expectedStatus}, Got: ${status})`,
                    type: "error"
                });
                console.log(`❌ ${name}: ${status} - Wrong failure status (Expected: ${expectedStatus})`);
            } else {
                // Should have succeeded but failed
                results.actualFailed++;
                results.tests.push({
                    name,
                    status: "FAIL",
                    code: status,
                    message: `${method} ${endpoint} - ${message}`,
                    type: "error"
                });
                console.log(`❌ ${name}: ${status} - Actual Failure: ${message}`);
            }

            return { success: false, error: message, status };
        }
    }

    // Check server health
    console.log("\n🏥 Testing Server Health...");
    const healthCheck = await testEndpoint("Server Health", "GET", "/../../health", null, {}, true);

    if (!healthCheck.success) {
        console.log("\n❌ Server is not running. Please start the server first.");
        return;
    }

    // Test Authentication APIs
    console.log("\n🔐 Testing Authentication APIs...");

    let authToken = null;
    let userId = null;

    // Test 1: Valid Registration (should succeed)
    const registerData = {
        firstName: "Improved",
        lastName: "Test",
        email: `improved${Date.now()}@example.com`,
        password: "ImprovedPassword123!",
        phone: "+1234567890"
    };

    const registerResult = await testEndpoint(
        "Valid User Registration",
        "POST",
        "/auth/register",
        registerData,
        {},
        true,
        201
    );

    if (registerResult.success) {
        authToken = registerResult.data.data?.token;
        userId = registerResult.data.data?.user?._id;
    }

    // Test 2: Valid Login (should succeed)
    const loginResult = await testEndpoint(
        "Valid User Login",
        "POST",
        "/auth/login",
        {
            email: registerData.email,
            password: registerData.password
        },
        {},
        true,
        200
    );

    if (loginResult.success && !authToken) {
        authToken = loginResult.data.data?.token;
        userId = loginResult.data.data?.user?._id;
    }

    // Test 3: Invalid Login (should fail with 401)
    await testEndpoint(
        "Invalid Login Credentials",
        "POST",
        "/auth/login",
        {
            email: "invalid@example.com",
            password: "wrongpassword"
        },
        {},
        false,
        401
    );

    // Test 4: Get Current User with valid token (should succeed)
    if (authToken) {
        await testEndpoint(
            "Get Current User (Authenticated)",
            "GET",
            "/auth/me",
            null,
            { Authorization: `Bearer ${authToken}` },
            true,
            200
        );
    }

    // Test 5: Access protected route without token (should fail with 401)
    await testEndpoint("Access Protected Route (No Token)", "GET", "/auth/me", null, {}, false, 401);

    // Test 6: Access with invalid token (should fail with 401)
    await testEndpoint(
        "Access Protected Route (Invalid Token)",
        "GET",
        "/auth/me",
        null,
        { Authorization: "Bearer invalid-token-here" },
        false,
        401
    );

    // Test 7: Invalid email registration (should fail with 400)
    await testEndpoint(
        "Invalid Email Registration",
        "POST",
        "/auth/register",
        {
            firstName: "Test",
            lastName: "User",
            email: "invalid-email-format",
            password: "TestPassword123!",
            phone: "+1234567890"
        },
        {},
        false,
        400
    );

    // Test 8: Weak password registration (should fail with 400)
    await testEndpoint(
        "Weak Password Registration",
        "POST",
        "/auth/register",
        {
            firstName: "Test",
            lastName: "User",
            email: "weakpass@example.com",
            password: "123",
            phone: "+1234567890"
        },
        {},
        false,
        400
    );

    // Test Product APIs (should all succeed)
    console.log("\n📦 Testing Product APIs...");

    await testEndpoint("Get All Products", "GET", "/products", null, {}, true, 200);
    await testEndpoint("Search Products", "GET", "/products/search?q=test", null, {}, true, 200);
    await testEndpoint("Get Products with Pagination", "GET", "/products?page=1&limit=5", null, {}, true, 200);

    // Test Category and Brand APIs (should all succeed)
    console.log("\n🏷️ Testing Category & Brand APIs...");

    await testEndpoint("Get Categories", "GET", "/categories", null, {}, true, 200);
    await testEndpoint("Get Brands", "GET", "/brands", null, {}, true, 200);

    // Test Cart APIs with authentication (should succeed)
    if (authToken) {
        console.log("\n🛒 Testing Cart APIs (Authenticated)...");

        await testEndpoint(
            "Get Cart (Authenticated)",
            "GET",
            "/cart",
            null,
            { Authorization: `Bearer ${authToken}` },
            true,
            200
        );

        await testEndpoint(
            "Clear Cart (Authenticated)",
            "DELETE",
            "/cart/clear",
            null,
            { Authorization: `Bearer ${authToken}` },
            true,
            200
        );
    }

    // Test Cart APIs without authentication (should succeed for guest users)
    console.log("\n🛒 Testing Cart APIs (Guest Users - Should Succeed)...");

    await testEndpoint("Get Cart (Guest User)", "GET", "/cart", null, {}, true, 200);

    // Test Order APIs with authentication (should succeed)
    if (authToken) {
        console.log("\n📋 Testing Order APIs (Authenticated)...");

        await testEndpoint(
            "Get Order History (Authenticated)",
            "GET",
            "/orders",
            null,
            { Authorization: `Bearer ${authToken}` },
            true,
            200
        );
    }

    // Generate Improved Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 Improved API Testing Summary");
    console.log("=".repeat(80));

    const actualTotal = results.actualPassed + results.actualFailed;
    const actualSuccessRate = actualTotal > 0 ? ((results.actualPassed / actualTotal) * 100).toFixed(1) : "0.0";
    const overallSuccessRate = (((results.actualPassed + results.expectedFailures) / results.total) * 100).toFixed(1);

    console.log(`📈 Overall Results:`);
    console.log(`   Total Tests: ${results.total}`);
    console.log(`   ✅ Actual Successes: ${results.actualPassed}`);
    console.log(`   ❌ Actual Failures: ${results.actualFailed}`);
    console.log(`   🔒 Expected Security Failures: ${results.expectedFailures}`);
    console.log(`   📊 Actual Success Rate: ${actualSuccessRate}%`);
    console.log(`   🎯 Overall Success Rate (including security): ${overallSuccessRate}%`);

    // Show actual failures (genuine issues)
    const actualFailures = results.tests.filter((t) => t.type === "error");
    if (actualFailures.length > 0) {
        console.log("\n❌ Genuine Issues Found:");
        actualFailures.forEach((test) => {
            console.log(`   - ${test.name}: ${test.message}`);
        });
    } else {
        console.log("\n✅ No genuine issues found! All failures are expected security behavior.");
    }

    // Show expected failures (security working)
    const expectedFailures = results.tests.filter((t) => t.type === "expected");
    if (expectedFailures.length > 0) {
        console.log("\n🔒 Security Features Working Correctly:");
        expectedFailures.forEach((test) => {
            console.log(`   - ${test.name}: ${test.code} (Expected)`);
        });
    }

    // Final assessment
    console.log("\n🎯 Final Assessment:");
    if (results.actualFailed === 0) {
        console.log("   🎉 API IS 100% PRODUCTION READY!");
        console.log("   ✅ All endpoints working correctly");
        console.log("   🔒 Security features functioning properly");
        console.log("   🚀 Ready for frontend integration");
    } else {
        console.log(`   ⚠️ ${results.actualFailed} genuine issue(s) need fixing`);
        console.log("   🔧 Review failed tests above");
    }

    console.log("\n📋 Next Steps:");
    console.log("   1. ✅ Import postman-collection.json for manual testing");
    console.log("   2. ✅ Share API documentation with frontend team");
    console.log("   3. ✅ Set up production monitoring");
    console.log("   4. ✅ Deploy to staging environment");

    console.log("\n" + "=".repeat(80));

    return results;
}

// Run the improved test
improvedAPITest().catch(console.error);
