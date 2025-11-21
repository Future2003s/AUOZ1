const axios = require("axios");

// Cấu hình API
const API_BASE_URL = "http://localhost:5000/api/v1";
const TEST_PRODUCT_ID = "64f8b8b8b8b8b8b8b8b8b8b8"; // Thay bằng ID thực tế
const TEST_CATEGORY_ID = "64f8b8b8b8b8b8b8b8b8b8b9"; // Thay bằng ID thực tế
const TEST_USER_ID = "64f8b8b8b8b8b8b8b8b8b8ba"; // Thay bằng ID thực tế

// Test data
const testData = {
    product: {
        name: "Sản phẩm test",
        price: 299000,
        sku: "TEST-001",
        description: "Mô tả sản phẩm test"
    },
    category: {
        name: "Danh mục test",
        description: "Mô tả danh mục test"
    },
    brand: {
        name: "Thương hiệu test",
        description: "Mô tả thương hiệu test"
    },
    review: {
        rating: 5,
        productId: TEST_PRODUCT_ID,
        comment: "Đánh giá rất tốt!"
    },
    address: {
        street: "123 Đường Test",
        city: "TP. Test",
        state: "Tỉnh Test",
        zipCode: "12345",
        country: "Việt Nam"
    },
    order: {
        items: [
            {
                productId: TEST_PRODUCT_ID,
                quantity: 2
            }
        ],
        shippingAddress: {
            street: "123 Đường Test",
            city: "TP. Test",
            zipCode: "12345",
            country: "Việt Nam"
        }
    },
    cart: {
        productId: TEST_PRODUCT_ID,
        quantity: 1
    }
};

// Hàm test tất cả APIs
async function testAllAPIs() {
    console.log("🚀 Bắt đầu test tất cả APIs với validation thống nhất...");

    try {
        // Test 1: Products API
        await testProductsAPI();

        // Test 2: Categories API
        await testCategoriesAPI();

        // Test 3: Brands API
        await testBrandsAPI();

        // Test 4: Reviews API
        await testReviewsAPI();

        // Test 5: Users API
        await testUsersAPI();

        // Test 6: Cart API
        await testCartAPI();

        // Test 7: Orders API
        await testOrdersAPI();

        // Test 8: Admin API
        await testAdminAPI();

        // Test 9: Analytics API
        await testAnalyticsAPI();

        console.log("\n🎉 Hoàn thành test tất cả APIs!");
    } catch (error) {
        console.error("❌ Lỗi khi test:", error.message);
    }
}

// Test Products API
async function testProductsAPI() {
    console.log("\n📦 Test Products API...");

    try {
        // Test create product (expect 401 - no token)
        await testAPI("POST", "/products", testData.product, null, 401, "Create product without token");

        // Test create product with invalid data (expect 400 - validation error)
        const invalidProduct = { name: "A" }; // Quá ngắn
        await testAPI("POST", "/products", invalidProduct, "fake-token", 400, "Create product with invalid data");

        // Test update product (expect 401 - no token)
        await testAPI(
            "PUT",
            `/products/${TEST_PRODUCT_ID}`,
            testData.product,
            null,
            401,
            "Update product without token"
        );

        console.log("✅ Products API tests completed");
    } catch (error) {
        console.error("❌ Products API test failed:", error.message);
    }
}

// Test Categories API
async function testCategoriesAPI() {
    console.log("\n📂 Test Categories API...");

    try {
        // Test create category (expect 401 - no token)
        await testAPI("POST", "/categories", testData.category, null, 401, "Create category without token");

        // Test create category with invalid data (expect 400 - validation error)
        const invalidCategory = { name: "" }; // Rỗng
        await testAPI("POST", "/categories", invalidCategory, "fake-token", 400, "Create category with invalid data");

        console.log("✅ Categories API tests completed");
    } catch (error) {
        console.error("❌ Categories API test failed:", error.message);
    }
}

// Test Brands API
async function testBrandsAPI() {
    console.log("\n🏷️ Test Brands API...");

    try {
        // Test create brand (expect 401 - no token)
        await testAPI("POST", "/brands", testData.brand, null, 401, "Create brand without token");

        // Test create brand with invalid data (expect 400 - validation error)
        const invalidBrand = { name: "A" }; // Quá ngắn
        await testAPI("POST", "/brands", invalidBrand, "fake-token", 400, "Create brand with invalid data");

        console.log("✅ Brands API tests completed");
    } catch (error) {
        console.error("❌ Brands API test failed:", error.message);
    }
}

// Test Reviews API
async function testReviewsAPI() {
    console.log("\n⭐ Test Reviews API...");

    try {
        // Test create review (expect 401 - no token)
        await testAPI("POST", "/reviews", testData.review, null, 401, "Create review without token");

        // Test create review with invalid data (expect 400 - validation error)
        const invalidReview = { rating: 6, productId: "invalid-id" }; // Rating > 5, invalid product ID
        await testAPI("POST", "/reviews", invalidReview, "fake-token", 400, "Create review with invalid data");

        console.log("✅ Reviews API tests completed");
    } catch (error) {
        console.error("❌ Reviews API test failed:", error.message);
    }
}

// Test Users API
async function testUsersAPI() {
    console.log("\n👤 Test Users API...");

    try {
        // Test add address (expect 401 - no token)
        await testAPI("POST", "/users/addresses", testData.address, null, 401, "Add address without token");

        // Test add address with invalid data (expect 400 - validation error)
        const invalidAddress = { street: "", city: "TP. Test" }; // Thiếu street
        await testAPI("POST", "/users/addresses", invalidAddress, "fake-token", 400, "Add address with invalid data");

        console.log("✅ Users API tests completed");
    } catch (error) {
        console.error("❌ Users API test failed:", error.message);
    }
}

// Test Cart API
async function testCartAPI() {
    console.log("\n🛒 Test Cart API...");

    try {
        // Test add to cart (expect 400 - validation error for invalid data)
        const invalidCart = { productId: "invalid-id", quantity: 0 }; // Invalid product ID, quantity = 0
        await testAPI("POST", "/cart/items", invalidCart, null, 400, "Add to cart with invalid data");

        console.log("✅ Cart API tests completed");
    } catch (error) {
        console.error("❌ Cart API test failed:", error.message);
    }
}

// Test Orders API
async function testOrdersAPI() {
    console.log("\n📋 Test Orders API...");

    try {
        // Test create order (expect 401 - no token)
        await testAPI("POST", "/orders", testData.order, null, 401, "Create order without token");

        // Test create order with invalid data (expect 400 - validation error)
        const invalidOrder = { items: [] }; // Empty items array
        await testAPI("POST", "/orders", invalidOrder, "fake-token", 400, "Create order with invalid data");

        console.log("✅ Orders API tests completed");
    } catch (error) {
        console.error("❌ Orders API test failed:", error.message);
    }
}

// Test Admin API
async function testAdminAPI() {
    console.log("\n👑 Test Admin API...");

    try {
        // Test admin routes (expect 401 - no token)
        await testAPI("GET", "/admin/dashboard", null, null, 401, "Admin dashboard without token");

        // Test admin action with invalid data (expect 400 - validation error)
        const invalidAction = { action: "invalid-action" }; // Invalid action
        await testAPI(
            "PUT",
            `/admin/users/${TEST_USER_ID}/status`,
            invalidAction,
            "fake-token",
            400,
            "Admin action with invalid data"
        );

        console.log("✅ Admin API tests completed");
    } catch (error) {
        console.error("❌ Admin API test failed:", error.message);
    }
}

// Test Analytics API
async function testAnalyticsAPI() {
    console.log("\n📊 Test Analytics API...");

    try {
        // Test analytics routes (expect 401 - no token)
        await testAPI("GET", "/analytics/dashboard", null, null, 401, "Analytics dashboard without token");

        console.log("✅ Analytics API tests completed");
    } catch (error) {
        console.error("❌ Analytics API test failed:", error.message);
    }
}

// Hàm helper để test API
async function testAPI(method, endpoint, data, token, expectedStatus, description) {
    try {
        const config = {
            method: method.toLowerCase(),
            url: `${API_BASE_URL}${endpoint}`,
            headers: {}
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (data) {
            if (method === "GET") {
                config.params = data;
            } else {
                config.data = data;
            }
        }

        const response = await axios(config);

        if (response.status === expectedStatus) {
            console.log(`✅ ${description}: Expected ${expectedStatus}, got ${response.status}`);
        } else {
            console.log(`❌ ${description}: Expected ${expectedStatus}, got ${response.status}`);
        }
    } catch (error) {
        if (error.response && error.response.status === expectedStatus) {
            console.log(`✅ ${description}: Expected ${expectedStatus}, got ${error.response.status}`);

            // Log validation errors if any
            if (error.response.data && error.response.data.errors) {
                console.log(`🔍 Validation errors:`, error.response.data.errors);
            }
        } else {
            console.log(
                `❌ ${description}: Expected ${expectedStatus}, got ${error.response?.status || "Network error"}`
            );
        }
    }
}

// Chạy test
if (require.main === module) {
    testAllAPIs();
}

module.exports = { testAllAPIs };
