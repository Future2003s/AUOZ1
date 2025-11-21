const axios = require("axios");
const fs = require("fs");

const API_BASE_URL = "http://localhost:8081/api/v1";
const TEST_RESULTS = [];

// Test configuration
const TEST_CONFIG = {
    timeout: 10000,
    retries: 2,
    delay: 1000
};

// Test data
const TEST_DATA = {
    validUser: {
        firstName: "Test",
        lastName: "User",
        email: "testuser@example.com",
        password: "TestPassword123!",
        phone: "+1234567890"
    },
    adminUser: {
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        password: "AdminPassword123!",
        phone: "+1234567891"
    },
    invalidUser: {
        email: "invalid@example.com",
        password: "wrongpassword"
    },
    testProduct: {
        name: "Test Product",
        description: "A test product for API testing",
        price: 99.99,
        category: "Electronics",
        brand: "TestBrand",
        sku: "TEST-001",
        stock: 100,
        images: ["test-image.jpg"]
    }
};

// Global variables for test state
let authToken = null;
let adminToken = null;
let refreshToken = null;
let testUserId = null;
let testProductId = null;
let testOrderId = null;

// Utility functions
function logTest(category, endpoint, method, status, success, message, data = null) {
    const result = {
        timestamp: new Date().toISOString(),
        category,
        endpoint,
        method,
        status,
        success,
        message,
        data
    };

    TEST_RESULTS.push(result);

    const statusIcon = success ? "✅" : "❌";
    const statusCode = status ? `[${status}]` : "";
    console.log(`${statusIcon} ${category} - ${method} ${endpoint} ${statusCode}: ${message}`);

    if (!success && data) {
        console.log(`   Error details:`, JSON.stringify(data, null, 2));
    }
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            timeout: TEST_CONFIG.timeout,
            headers: {
                "Content-Type": "application/json",
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, status: response.status, data: response.data };
    } catch (error) {
        return {
            success: false,
            status: error.response?.status || 0,
            data: error.response?.data || { message: error.message }
        };
    }
}

async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Test suites
async function testServerHealth() {
    console.log("\n🏥 Testing Server Health...");

    const result = await makeRequest("GET", "/../../health");
    logTest(
        "Health",
        "/health",
        "GET",
        result.status,
        result.success,
        result.success ? "Server is healthy" : "Server health check failed",
        result.data
    );

    return result.success;
}

async function testAuthenticationAPIs() {
    console.log("\n🔐 Testing Authentication APIs...");

    // Test 1: User Registration
    const registerResult = await makeRequest("POST", "/auth/register", TEST_DATA.validUser);
    logTest(
        "Auth",
        "/auth/register",
        "POST",
        registerResult.status,
        registerResult.success,
        registerResult.success ? "User registration successful" : "User registration failed",
        registerResult.data
    );

    if (registerResult.success) {
        testUserId = registerResult.data.data?.user?._id;
        authToken = registerResult.data.data?.token;
        refreshToken = registerResult.data.data?.refreshToken;
    }

    // Test 2: User Login
    const loginResult = await makeRequest("POST", "/auth/login", {
        email: TEST_DATA.validUser.email,
        password: TEST_DATA.validUser.password
    });
    logTest(
        "Auth",
        "/auth/login",
        "POST",
        loginResult.status,
        loginResult.success,
        loginResult.success ? "User login successful" : "User login failed",
        loginResult.data
    );

    if (loginResult.success && !authToken) {
        authToken = loginResult.data.data?.token;
        refreshToken = loginResult.data.data?.refreshToken;
        testUserId = loginResult.data.data?.user?._id;
    }

    // Test 3: Invalid Login
    const invalidLoginResult = await makeRequest("POST", "/auth/login", TEST_DATA.invalidUser);
    logTest(
        "Auth",
        "/auth/login",
        "POST",
        invalidLoginResult.status,
        !invalidLoginResult.success,
        !invalidLoginResult.success ? "Invalid login correctly rejected" : "Invalid login should have failed",
        invalidLoginResult.data
    );

    // Test 4: Get Current User (requires auth)
    if (authToken) {
        const meResult = await makeRequest("GET", "/auth/me", null, {
            Authorization: `Bearer ${authToken}`
        });
        logTest(
            "Auth",
            "/auth/me",
            "GET",
            meResult.status,
            meResult.success,
            meResult.success ? "Get current user successful" : "Get current user failed",
            meResult.data
        );
    }

    // Test 5: Refresh Token
    if (refreshToken) {
        const refreshResult = await makeRequest("POST", "/auth/refresh-token", {
            refreshToken: refreshToken
        });
        logTest(
            "Auth",
            "/auth/refresh-token",
            "POST",
            refreshResult.status,
            refreshResult.success,
            refreshResult.success ? "Token refresh successful" : "Token refresh failed",
            refreshResult.data
        );

        if (refreshResult.success) {
            authToken = refreshResult.data.data?.token;
            refreshToken = refreshResult.data.data?.refreshToken;
        }
    }

    // Test 6: Rate Limiting (multiple failed attempts)
    console.log("   Testing rate limiting...");
    for (let i = 0; i < 6; i++) {
        const rateLimitResult = await makeRequest("POST", "/auth/login", {
            email: "ratelimit@test.com",
            password: "wrongpassword"
        });

        if (rateLimitResult.status === 429) {
            logTest(
                "Auth",
                "/auth/login",
                "POST",
                rateLimitResult.status,
                true,
                "Rate limiting working correctly",
                rateLimitResult.data
            );
            break;
        }

        if (i === 5) {
            logTest(
                "Auth",
                "/auth/login",
                "POST",
                rateLimitResult.status,
                false,
                "Rate limiting not working",
                rateLimitResult.data
            );
        }

        await delay(100);
    }
}

async function testUserManagementAPIs() {
    console.log("\n👤 Testing User Management APIs...");

    if (!authToken) {
        logTest("User", "N/A", "N/A", 0, false, "No auth token available for user tests");
        return;
    }

    // Test 1: Get User Profile
    const profileResult = await makeRequest("GET", "/users/profile", null, {
        Authorization: `Bearer ${authToken}`
    });
    logTest(
        "User",
        "/users/profile",
        "GET",
        profileResult.status,
        profileResult.success,
        profileResult.success ? "Get user profile successful" : "Get user profile failed",
        profileResult.data
    );

    // Test 2: Update User Profile
    const updateData = {
        firstName: "Updated",
        lastName: "User",
        phone: "+1234567899"
    };
    const updateResult = await makeRequest("PUT", "/users/profile", updateData, {
        Authorization: `Bearer ${authToken}`
    });
    logTest(
        "User",
        "/users/profile",
        "PUT",
        updateResult.status,
        updateResult.success,
        updateResult.success ? "Update user profile successful" : "Update user profile failed",
        updateResult.data
    );

    // Test 3: Change Password
    const changePasswordResult = await makeRequest(
        "PUT",
        "/auth/change-password",
        {
            currentPassword: TEST_DATA.validUser.password,
            newPassword: "NewPassword123!"
        },
        {
            Authorization: `Bearer ${authToken}`
        }
    );
    logTest(
        "User",
        "/auth/change-password",
        "PUT",
        changePasswordResult.status,
        changePasswordResult.success,
        changePasswordResult.success ? "Change password successful" : "Change password failed",
        changePasswordResult.data
    );

    // Update password for future tests
    if (changePasswordResult.success) {
        TEST_DATA.validUser.password = "NewPassword123!";
    }
}

async function testProductAPIs() {
    console.log("\n📦 Testing Product APIs...");

    // Test 1: Get All Products (public)
    const productsResult = await makeRequest("GET", "/products");
    logTest(
        "Product",
        "/products",
        "GET",
        productsResult.status,
        productsResult.success,
        productsResult.success ? "Get all products successful" : "Get all products failed",
        productsResult.success ? { count: productsResult.data.data?.length || 0 } : productsResult.data
    );

    // Test 2: Get Products with Pagination
    const paginatedResult = await makeRequest("GET", "/products?page=1&limit=5");
    logTest(
        "Product",
        "/products?page=1&limit=5",
        "GET",
        paginatedResult.status,
        paginatedResult.success,
        paginatedResult.success ? "Get paginated products successful" : "Get paginated products failed",
        paginatedResult.data
    );

    // Test 3: Search Products
    const searchResult = await makeRequest("GET", "/products/search?q=test");
    logTest(
        "Product",
        "/products/search?q=test",
        "GET",
        searchResult.status,
        searchResult.success,
        searchResult.success ? "Product search successful" : "Product search failed",
        searchResult.data
    );

    // Test 4: Get Product by ID (if products exist)
    if (productsResult.success && productsResult.data.data?.length > 0) {
        const productId = productsResult.data.data[0]._id;
        const productResult = await makeRequest("GET", `/products/${productId}`);
        logTest(
            "Product",
            `/products/${productId}`,
            "GET",
            productResult.status,
            productResult.success,
            productResult.success ? "Get product by ID successful" : "Get product by ID failed",
            productResult.data
        );

        testProductId = productId;
    }

    // Test 5: Get Categories
    const categoriesResult = await makeRequest("GET", "/categories");
    logTest(
        "Product",
        "/categories",
        "GET",
        categoriesResult.status,
        categoriesResult.success,
        categoriesResult.success ? "Get categories successful" : "Get categories failed",
        categoriesResult.data
    );

    // Test 6: Get Brands
    const brandsResult = await makeRequest("GET", "/brands");
    logTest(
        "Product",
        "/brands",
        "GET",
        brandsResult.status,
        brandsResult.success,
        brandsResult.success ? "Get brands successful" : "Get brands failed",
        brandsResult.data
    );
}

async function testCartAPIs() {
    console.log("\n🛒 Testing Cart APIs...");

    if (!authToken || !testProductId) {
        logTest("Cart", "N/A", "N/A", 0, false, "No auth token or product ID available for cart tests");
        return;
    }

    // Test 1: Get Cart
    const cartResult = await makeRequest("GET", "/cart", null, {
        Authorization: `Bearer ${authToken}`
    });
    logTest(
        "Cart",
        "/cart",
        "GET",
        cartResult.status,
        cartResult.success,
        cartResult.success ? "Get cart successful" : "Get cart failed",
        cartResult.data
    );

    // Test 2: Add Item to Cart
    const addItemResult = await makeRequest(
        "POST",
        "/cart/add",
        {
            productId: testProductId,
            quantity: 2
        },
        {
            Authorization: `Bearer ${authToken}`
        }
    );
    logTest(
        "Cart",
        "/cart/add",
        "POST",
        addItemResult.status,
        addItemResult.success,
        addItemResult.success ? "Add item to cart successful" : "Add item to cart failed",
        addItemResult.data
    );

    // Test 3: Update Cart Item
    const updateItemResult = await makeRequest(
        "PUT",
        "/cart/update",
        {
            productId: testProductId,
            quantity: 3
        },
        {
            Authorization: `Bearer ${authToken}`
        }
    );
    logTest(
        "Cart",
        "/cart/update",
        "PUT",
        updateItemResult.status,
        updateItemResult.success,
        updateItemResult.success ? "Update cart item successful" : "Update cart item failed",
        updateItemResult.data
    );

    // Test 4: Remove Item from Cart
    const removeItemResult = await makeRequest("DELETE", `/cart/remove/${testProductId}`, null, {
        Authorization: `Bearer ${authToken}`
    });
    logTest(
        "Cart",
        `/cart/remove/${testProductId}`,
        "DELETE",
        removeItemResult.status,
        removeItemResult.success,
        removeItemResult.success ? "Remove item from cart successful" : "Remove item from cart failed",
        removeItemResult.data
    );

    // Test 5: Clear Cart
    const clearCartResult = await makeRequest("DELETE", "/cart/clear", null, {
        Authorization: `Bearer ${authToken}`
    });
    logTest(
        "Cart",
        "/cart/clear",
        "DELETE",
        clearCartResult.status,
        clearCartResult.success,
        clearCartResult.success ? "Clear cart successful" : "Clear cart failed",
        clearCartResult.data
    );
}

async function testOrderAPIs() {
    console.log("\n📋 Testing Order APIs...");

    if (!authToken) {
        logTest("Order", "N/A", "N/A", 0, false, "No auth token available for order tests");
        return;
    }

    // Test 1: Get Order History
    const ordersResult = await makeRequest("GET", "/orders", null, {
        Authorization: `Bearer ${authToken}`
    });
    logTest(
        "Order",
        "/orders",
        "GET",
        ordersResult.status,
        ordersResult.success,
        ordersResult.success ? "Get order history successful" : "Get order history failed",
        ordersResult.data
    );

    // Test 2: Create Order (if cart has items)
    if (testProductId) {
        // First add item to cart
        await makeRequest(
            "POST",
            "/cart/add",
            {
                productId: testProductId,
                quantity: 1
            },
            {
                Authorization: `Bearer ${authToken}`
            }
        );

        const createOrderResult = await makeRequest(
            "POST",
            "/orders",
            {
                shippingAddress: {
                    street: "123 Test St",
                    city: "Test City",
                    state: "TS",
                    zipCode: "12345",
                    country: "Test Country"
                },
                paymentMethod: "credit_card"
            },
            {
                Authorization: `Bearer ${authToken}`
            }
        );
        logTest(
            "Order",
            "/orders",
            "POST",
            createOrderResult.status,
            createOrderResult.success,
            createOrderResult.success ? "Create order successful" : "Create order failed",
            createOrderResult.data
        );

        if (createOrderResult.success) {
            testOrderId = createOrderResult.data.data?._id;
        }
    }

    // Test 3: Get Order by ID
    if (testOrderId) {
        const orderResult = await makeRequest("GET", `/orders/${testOrderId}`, null, {
            Authorization: `Bearer ${authToken}`
        });
        logTest(
            "Order",
            `/orders/${testOrderId}`,
            "GET",
            orderResult.status,
            orderResult.success,
            orderResult.success ? "Get order by ID successful" : "Get order by ID failed",
            orderResult.data
        );
    }
}

async function testAdminAPIs() {
    console.log("\n👑 Testing Admin APIs...");

    // Test 1: Admin Login (try with admin credentials)
    const adminLoginResult = await makeRequest("POST", "/auth/login", {
        email: TEST_DATA.adminUser.email,
        password: TEST_DATA.adminUser.password
    });

    if (!adminLoginResult.success) {
        // Try to register admin user first
        const adminRegisterResult = await makeRequest("POST", "/auth/register", {
            ...TEST_DATA.adminUser,
            role: "admin"
        });

        if (adminRegisterResult.success) {
            adminToken = adminRegisterResult.data.data?.token;
        }
    } else {
        adminToken = adminLoginResult.data.data?.token;
    }

    logTest(
        "Admin",
        "/auth/login",
        "POST",
        adminLoginResult.status,
        adminLoginResult.success || !!adminToken,
        adminToken ? "Admin authentication successful" : "Admin authentication failed",
        adminLoginResult.data
    );

    if (!adminToken) {
        logTest("Admin", "N/A", "N/A", 0, false, "No admin token available for admin tests");
        return;
    }

    // Test 2: Get All Users (admin only)
    const usersResult = await makeRequest("GET", "/admin/users", null, {
        Authorization: `Bearer ${adminToken}`
    });
    logTest(
        "Admin",
        "/admin/users",
        "GET",
        usersResult.status,
        usersResult.success,
        usersResult.success ? "Get all users successful" : "Get all users failed",
        usersResult.data
    );

    // Test 3: Create Product (admin only)
    const createProductResult = await makeRequest("POST", "/admin/products", TEST_DATA.testProduct, {
        Authorization: `Bearer ${adminToken}`
    });
    logTest(
        "Admin",
        "/admin/products",
        "POST",
        createProductResult.status,
        createProductResult.success,
        createProductResult.success ? "Create product successful" : "Create product failed",
        createProductResult.data
    );

    // Test 4: Update Product (admin only)
    if (createProductResult.success || testProductId) {
        const productId = createProductResult.data?.data?._id || testProductId;
        const updateProductResult = await makeRequest(
            "PUT",
            `/admin/products/${productId}`,
            {
                name: "Updated Test Product",
                price: 149.99
            },
            {
                Authorization: `Bearer ${adminToken}`
            }
        );
        logTest(
            "Admin",
            `/admin/products/${productId}`,
            "PUT",
            updateProductResult.status,
            updateProductResult.success,
            updateProductResult.success ? "Update product successful" : "Update product failed",
            updateProductResult.data
        );
    }

    // Test 5: Get Analytics (admin only)
    const analyticsResult = await makeRequest("GET", "/admin/analytics", null, {
        Authorization: `Bearer ${adminToken}`
    });
    logTest(
        "Admin",
        "/admin/analytics",
        "GET",
        analyticsResult.status,
        analyticsResult.success,
        analyticsResult.success ? "Get analytics successful" : "Get analytics failed",
        analyticsResult.data
    );
}

async function testSecurityAndValidation() {
    console.log("\n🔒 Testing Security & Validation...");

    // Test 1: Access protected route without token
    const noTokenResult = await makeRequest("GET", "/auth/me");
    logTest(
        "Security",
        "/auth/me",
        "GET",
        noTokenResult.status,
        !noTokenResult.success,
        !noTokenResult.success ? "Protected route correctly requires auth" : "Protected route should require auth",
        noTokenResult.data
    );

    // Test 2: Access with invalid token
    const invalidTokenResult = await makeRequest("GET", "/auth/me", null, {
        Authorization: "Bearer invalid-token"
    });
    logTest(
        "Security",
        "/auth/me",
        "GET",
        invalidTokenResult.status,
        !invalidTokenResult.success,
        !invalidTokenResult.success ? "Invalid token correctly rejected" : "Invalid token should be rejected",
        invalidTokenResult.data
    );

    // Test 3: Input validation - invalid email
    const invalidEmailResult = await makeRequest("POST", "/auth/register", {
        firstName: "Test",
        lastName: "User",
        email: "invalid-email",
        password: "password123"
    });
    logTest(
        "Security",
        "/auth/register",
        "POST",
        invalidEmailResult.status,
        !invalidEmailResult.success,
        !invalidEmailResult.success ? "Invalid email correctly rejected" : "Invalid email should be rejected",
        invalidEmailResult.data
    );

    // Test 4: Input validation - weak password
    const weakPasswordResult = await makeRequest("POST", "/auth/register", {
        firstName: "Test",
        lastName: "User",
        email: "test@weak.com",
        password: "123"
    });
    logTest(
        "Security",
        "/auth/register",
        "POST",
        weakPasswordResult.status,
        !weakPasswordResult.success,
        !weakPasswordResult.success ? "Weak password correctly rejected" : "Weak password should be rejected",
        weakPasswordResult.data
    );

    // Test 5: SQL Injection attempt
    const sqlInjectionResult = await makeRequest("POST", "/auth/login", {
        email: "admin@test.com'; DROP TABLE users; --",
        password: "password"
    });
    logTest(
        "Security",
        "/auth/login",
        "POST",
        sqlInjectionResult.status,
        !sqlInjectionResult.success,
        !sqlInjectionResult.success ? "SQL injection attempt blocked" : "SQL injection should be blocked",
        sqlInjectionResult.data
    );
}

async function testCORSAndHeaders() {
    console.log("\n🌐 Testing CORS & Headers...");

    try {
        const response = await axios.options(`${API_BASE_URL}/auth/login`, {
            headers: {
                Origin: "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        });

        const corsHeaders = {
            "Access-Control-Allow-Origin": response.headers["access-control-allow-origin"],
            "Access-Control-Allow-Methods": response.headers["access-control-allow-methods"],
            "Access-Control-Allow-Headers": response.headers["access-control-allow-headers"]
        };

        logTest("CORS", "/auth/login", "OPTIONS", response.status, true, "CORS preflight successful", corsHeaders);
    } catch (error) {
        logTest(
            "CORS",
            "/auth/login",
            "OPTIONS",
            error.response?.status || 0,
            false,
            "CORS preflight failed",
            error.response?.data || { message: error.message }
        );
    }
}

// Continue with more test functions...
module.exports = {
    testServerHealth,
    testAuthenticationAPIs,
    testUserManagementAPIs,
    testProductAPIs,
    testCartAPIs,
    testOrderAPIs,
    testAdminAPIs,
    testSecurityAndValidation,
    testCORSAndHeaders,
    TEST_RESULTS,
    logTest,
    makeRequest
};
