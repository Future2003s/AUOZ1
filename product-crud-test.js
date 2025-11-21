const axios = require("axios");

const API_BASE_URL = "http://localhost:8081/api/v1";

async function productCRUDTest() {
    console.log("🛍️ Product CRUD Operations Test");
    console.log("🎯 Goal: Verify Create, Read, Update, Delete functionality");
    console.log("=".repeat(80));

    const testResults = {
        timestamp: new Date().toISOString(),
        operations: {
            create: { status: "unknown", tests: [], endpoint: "POST /products" },
            read: { status: "unknown", tests: [], endpoint: "GET /products" },
            readById: { status: "unknown", tests: [], endpoint: "GET /products/:id" },
            update: { status: "unknown", tests: [], endpoint: "PUT /products/:id" },
            delete: { status: "unknown", tests: [], endpoint: "DELETE /products/:id" }
        },
        authentication: {
            required: false,
            tested: false,
            results: []
        },
        overallStatus: "unknown"
    };

    let authToken = null;
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
            console.log(
                `   ${success ? "✅" : "❌"} ${testName}: ${result.status} (${duration}ms) ${success ? "SUCCESS" : "FAILED"}`
            );

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
            console.log(
                `   ${success ? "✅" : "❌"} ${testName}: ${error.response?.status || "ERR"} (${duration}ms) ${success ? "EXPECTED FAIL" : "UNEXPECTED FAIL"}`
            );

            if (!success) {
                console.log(`      Error: ${error.message}`);
                if (error.response?.data) {
                    console.log(`      Details: ${JSON.stringify(error.response.data, null, 2)}`);
                }
            }

            return { status: error.response?.status || 0, data: error.response?.data, error: error.message };
        }
    }

    // Setup: Get authentication token
    console.log("\n🔐 Setup: Getting Authentication Token");
    console.log("-".repeat(50));

    try {
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: "Product",
            lastName: "Admin",
            email: `productadmin${Date.now()}@example.com`,
            password: "ProductAdmin123!",
            phone: "+1234567890"
        });

        authToken = registerResponse.data.data.token;
        console.log(`✅ Authentication token obtained: ${authToken ? "YES" : "NO"}`);
    } catch (error) {
        console.log(`⚠️ Could not get auth token: ${error.message}`);
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

    // Test 1: READ Operations (Already working, but let's verify)
    console.log("\n📖 Testing READ Operations");
    console.log("-".repeat(50));

    const readAllResult = await runCRUDTest("read", "Get All Products", async () => {
        const response = await axios.get(`${API_BASE_URL}/products`);

        // Store a product ID for later tests
        if (response.data.data && response.data.data.length > 0) {
            testProductId = response.data.data[0]._id;
        }

        return { status: response.status, data: response.data };
    });

    if (testProductId) {
        await runCRUDTest("readById", "Get Product by ID", async () => {
            const response = await axios.get(`${API_BASE_URL}/products/${testProductId}`);
            return { status: response.status, data: response.data };
        });
    } else {
        console.log("⚠️ No existing products found for GET by ID test");
    }

    // Test 2: CREATE Operations
    console.log("\n➕ Testing CREATE Operations");
    console.log("-".repeat(50));

    const validProductData = {
        name: "Test Product CRUD",
        description: "This is a test product for CRUD operations testing",
        price: 99.99,
        sku: `TEST-CRUD-${Date.now()}`,
        category: testCategoryId || "507f1f77bcf86cd799439011", // fallback ObjectId
        quantity: 100,
        brand: testBrandId || "507f1f77bcf86cd799439012", // fallback ObjectId
        comparePrice: 129.99,
        salePrice: 89.99
    };

    // Test CREATE without authentication
    await runCRUDTest(
        "create",
        "Create Product (No Auth)",
        async () => {
            const response = await axios.post(`${API_BASE_URL}/products`, validProductData);
            return { status: response.status, data: response.data };
        },
        401
    ); // Expect 401 if auth required

    // Test CREATE with authentication
    if (authToken) {
        const createResult = await runCRUDTest(
            "create",
            "Create Product (With Auth)",
            async () => {
                const response = await axios.post(`${API_BASE_URL}/products`, validProductData, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });

                // Store created product ID for update/delete tests
                if (response.data.data && response.data.data._id) {
                    testProductId = response.data.data._id;
                }

                return { status: response.status, data: response.data };
            },
            201
        );
    }

    // Test CREATE with invalid data
    await runCRUDTest(
        "create",
        "Create Product (Invalid Data)",
        async () => {
            const invalidData = {
                name: "", // Invalid: empty name
                price: -10, // Invalid: negative price
                sku: "" // Invalid: empty SKU
            };

            const response = await axios.post(`${API_BASE_URL}/products`, invalidData, {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
            });
            return { status: response.status, data: response.data };
        },
        400
    );

    // Test 3: UPDATE Operations
    console.log("\n✏️ Testing UPDATE Operations");
    console.log("-".repeat(50));

    if (testProductId) {
        const updateData = {
            name: "Updated Test Product CRUD",
            description: "This product has been updated via CRUD test",
            price: 149.99,
            quantity: 75
        };

        // Test UPDATE without authentication
        await runCRUDTest(
            "update",
            "Update Product (No Auth)",
            async () => {
                const response = await axios.put(`${API_BASE_URL}/products/${testProductId}`, updateData);
                return { status: response.status, data: response.data };
            },
            401
        );

        // Test UPDATE with authentication
        if (authToken) {
            await runCRUDTest("update", "Update Product (With Auth)", async () => {
                const response = await axios.put(`${API_BASE_URL}/products/${testProductId}`, updateData, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                return { status: response.status, data: response.data };
            });
        }

        // Test UPDATE with invalid ID
        await runCRUDTest(
            "update",
            "Update Product (Invalid ID)",
            async () => {
                const response = await axios.put(`${API_BASE_URL}/products/invalid-id`, updateData, {
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
                });
                return { status: response.status, data: response.data };
            },
            400
        );

        // Test UPDATE with non-existent ID
        await runCRUDTest(
            "update",
            "Update Product (Non-existent ID)",
            async () => {
                const response = await axios.put(`${API_BASE_URL}/products/507f1f77bcf86cd799439999`, updateData, {
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
                });
                return { status: response.status, data: response.data };
            },
            404
        );
    } else {
        console.log("⚠️ No product ID available for UPDATE tests");
    }

    // Test 4: DELETE Operations
    console.log("\n🗑️ Testing DELETE Operations");
    console.log("-".repeat(50));

    if (testProductId) {
        // Test DELETE without authentication
        await runCRUDTest(
            "delete",
            "Delete Product (No Auth)",
            async () => {
                const response = await axios.delete(`${API_BASE_URL}/products/${testProductId}`);
                return { status: response.status, data: response.data };
            },
            401
        );

        // Test DELETE with authentication
        if (authToken) {
            await runCRUDTest("delete", "Delete Product (With Auth)", async () => {
                const response = await axios.delete(`${API_BASE_URL}/products/${testProductId}`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                return { status: response.status, data: response.data };
            });
        }

        // Test DELETE with invalid ID
        await runCRUDTest(
            "delete",
            "Delete Product (Invalid ID)",
            async () => {
                const response = await axios.delete(`${API_BASE_URL}/products/invalid-id`, {
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
                });
                return { status: response.status, data: response.data };
            },
            400
        );

        // Test DELETE with non-existent ID
        await runCRUDTest(
            "delete",
            "Delete Product (Non-existent ID)",
            async () => {
                const response = await axios.delete(`${API_BASE_URL}/products/507f1f77bcf86cd799439999`, {
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
                });
                return { status: response.status, data: response.data };
            },
            404
        );
    } else {
        console.log("⚠️ No product ID available for DELETE tests");
    }

    // Calculate results
    Object.keys(testResults.operations).forEach((operation) => {
        const tests = testResults.operations[operation].tests;
        const successCount = tests.filter((test) => test.success).length;
        const totalCount = tests.length;

        if (totalCount > 0) {
            testResults.operations[operation].status = successCount === totalCount ? "PASS" : "PARTIAL";
            testResults.operations[operation].successRate = ((successCount / totalCount) * 100).toFixed(1);
        } else {
            testResults.operations[operation].status = "NOT_TESTED";
        }
    });

    // Determine overall status
    const operationStatuses = Object.values(testResults.operations).map((op) => op.status);
    const allPass = operationStatuses.every((status) => status === "PASS");
    const anyFail = operationStatuses.some((status) => status === "NOT_TESTED");

    testResults.overallStatus = allPass ? "PASS" : anyFail ? "INCOMPLETE" : "PARTIAL";

    // Generate Report
    console.log("\n" + "=".repeat(80));
    console.log("📊 PRODUCT CRUD TEST RESULTS");
    console.log("=".repeat(80));

    console.log(`\n📈 Overall Status: ${testResults.overallStatus}`);

    console.log(`\n📋 Operation Results:`);
    Object.entries(testResults.operations).forEach(([operation, data]) => {
        const icon = data.status === "PASS" ? "✅" : data.status === "PARTIAL" ? "⚠️" : "❌";
        const rate = data.successRate || "0.0";
        console.log(`   ${icon} ${operation.toUpperCase()}: ${data.status} (${rate}%) - ${data.endpoint}`);

        if (data.tests.length > 0) {
            data.tests.forEach((test) => {
                const testIcon = test.success ? "✅" : "❌";
                console.log(`      ${testIcon} ${test.name}: ${test.status}`);
            });
        }
    });

    // Recommendations
    console.log(`\n💡 Recommendations:`);

    const missingOperations = Object.entries(testResults.operations)
        .filter(([op, data]) => data.status === "NOT_TESTED" || data.tests.length === 0)
        .map(([op]) => op);

    if (missingOperations.length > 0) {
        console.log(`   🔧 Missing/Not Working Operations: ${missingOperations.join(", ")}`);
        console.log(`   📝 Need to implement these endpoints in the backend`);
    }

    const partialOperations = Object.entries(testResults.operations)
        .filter(([op, data]) => data.status === "PARTIAL")
        .map(([op]) => op);

    if (partialOperations.length > 0) {
        console.log(`   ⚠️ Partially Working Operations: ${partialOperations.join(", ")}`);
        console.log(`   🔍 Review failed tests above for specific issues`);
    }

    if (testResults.overallStatus === "PASS") {
        console.log(`   🎉 All CRUD operations working perfectly!`);
        console.log(`   ✅ Ready for production use`);
    }

    console.log("\n" + "=".repeat(80));

    // Save detailed report
    require("fs").writeFileSync("product-crud-report.json", JSON.stringify(testResults, null, 2));
    console.log("📄 Detailed CRUD report saved: product-crud-report.json");

    return testResults;
}

// Run product CRUD test
productCRUDTest().catch(console.error);
