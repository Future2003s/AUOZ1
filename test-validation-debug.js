const axios = require("axios");

// Cấu hình API
const API_BASE_URL = "http://localhost:5000/api/v1";

// Test data với dữ liệu không hợp lệ
const invalidData = {
    product: {
        name: "A", // Quá ngắn (min: 2)
        price: -100, // Giá âm (min: 0)
        sku: "" // Rỗng (required)
    },
    category: {
        name: "", // Rỗng (min: 2)
        description: "A".repeat(600) // Quá dài (max: 500)
    },
    review: {
        rating: 6, // Quá cao (max: 5)
        productId: "invalid-id", // Không phải MongoDB ID
        comment: "A".repeat(1100) // Quá dài (max: 1000)
    }
};

// Hàm test validation với logging chi tiết
async function testValidationDebug() {
    console.log("🔍 Bắt đầu debug validation...");

    try {
        // Test 1: Create product với dữ liệu không hợp lệ
        console.log("\n📦 Test 1: Create product với dữ liệu không hợp lệ");
        await testAPI("POST", "/products", invalidData.product, "fake-token", 400, "Create product validation");

        // Test 2: Create category với dữ liệu không hợp lệ
        console.log("\n📂 Test 2: Create category với dữ liệu không hợp lệ");
        await testAPI("POST", "/categories", invalidData.category, "fake-token", 400, "Create category validation");

        // Test 3: Create review với dữ liệu không hợp lệ
        console.log("\n⭐ Test 3: Create review với dữ liệu không hợp lệ");
        await testAPI("POST", "/reviews", invalidData.review, "fake-token", 400, "Create review validation");

        console.log("\n🎉 Hoàn thành debug validation!");
    } catch (error) {
        console.error("❌ Lỗi khi test:", error.message);
    }
}

// Hàm helper để test API với logging chi tiết
async function testAPI(method, endpoint, data, token, expectedStatus, description) {
    try {
        console.log(`\n🔍 Testing: ${method} ${endpoint}`);
        console.log(`📝 Data:`, JSON.stringify(data, null, 2));
        console.log(`🎯 Expected status: ${expectedStatus}`);

        const config = {
            method: method.toLowerCase(),
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                "Content-Type": "application/json"
            }
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (data) {
            config.data = data;
        }

        const response = await axios(config);

        console.log(`✅ Response status: ${response.status}`);
        console.log(`📄 Response data:`, JSON.stringify(response.data, null, 2));

        if (response.status === expectedStatus) {
            console.log(`✅ ${description}: Thành công - nhận đúng status ${expectedStatus}`);
        } else {
            console.log(`❌ ${description}: Thất bại - expected ${expectedStatus}, got ${response.status}`);
        }
    } catch (error) {
        console.log(`\n❌ Error occurred:`);

        if (error.response) {
            console.log(`📊 Status: ${error.response.status}`);
            console.log(`📄 Response data:`, JSON.stringify(error.response.data, null, 2));
            console.log(`🔍 Headers:`, JSON.stringify(error.response.headers, null, 2));

            if (error.response.status === expectedStatus) {
                console.log(`✅ ${description}: Thành công - nhận đúng status ${expectedStatus}`);

                // Kiểm tra format response
                if (error.response.data) {
                    console.log(`\n🔍 Validation Response Analysis:`);
                    console.log(`- Success: ${error.response.data.success}`);
                    console.log(`- Message: ${error.response.data.message}`);

                    if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
                        console.log(`- Number of errors: ${error.response.data.errors.length}`);
                        error.response.data.errors.forEach((err, index) => {
                            console.log(`  Error ${index + 1}:`);
                            console.log(`    Field: ${err.field}`);
                            console.log(`    Message: ${err.message}`);
                        });
                    } else {
                        console.log(`- No errors array found in response`);
                    }
                }
            } else {
                console.log(`❌ ${description}: Thất bại - expected ${expectedStatus}, got ${error.response.status}`);
            }
        } else if (error.request) {
            console.log(`❌ No response received:`, error.message);
        } else {
            console.log(`❌ Request setup error:`, error.message);
        }
    }
}

// Test validation với dữ liệu rỗng
async function testEmptyDataValidation() {
    console.log("\n🧪 Test validation với dữ liệu rỗng...");

    try {
        // Test với dữ liệu rỗng
        const emptyData = {
            name: "",
            price: "",
            sku: ""
        };

        await testAPI("POST", "/products", emptyData, "fake-token", 400, "Empty data validation");
    } catch (error) {
        console.error("❌ Lỗi khi test empty data:", error.message);
    }
}

// Test validation với dữ liệu null/undefined
async function testNullDataValidation() {
    console.log("\n🧪 Test validation với dữ liệu null/undefined...");

    try {
        // Test với dữ liệu null
        const nullData = {
            name: null,
            price: null,
            sku: null
        };

        await testAPI("POST", "/products", nullData, "fake-token", 400, "Null data validation");
    } catch (error) {
        console.error("❌ Lỗi khi test null data:", error.message);
    }
}

// Chạy tất cả tests
async function runAllTests() {
    console.log("🚀 Bắt đầu chạy tất cả validation tests...");

    await testValidationDebug();
    await testEmptyDataValidation();
    await testNullDataValidation();

    console.log("\n🎉 Hoàn thành tất cả tests!");
}

// Chạy test
if (require.main === module) {
    runAllTests();
}

module.exports = {
    testValidationDebug,
    testEmptyDataValidation,
    testNullDataValidation,
    runAllTests
};
