const axios = require("axios");

// Cấu hình API
const API_BASE_URL = "http://localhost:8081/api/v1";

// Test data
const testData = {
    valid: {
        name: "Sản phẩm test hợp lệ",
        price: 299000,
        sku: "TEST-001"
    },
    invalid: {
        name: "A", // Quá ngắn
        price: -100, // Giá âm
        sku: "" // Rỗng
    },
    empty: {
        name: "",
        price: "",
        sku: ""
    },
    missing: {
        // Thiếu tất cả fields
    }
};

// Hàm test validation đã sửa
async function testFixedValidation() {
    console.log("🚀 Bắt đầu test validation đã sửa...");

    try {
        // Test 1: Dữ liệu hợp lệ (expect 401 - no token, nhưng validation pass)
        console.log("\n📦 Test 1: Dữ liệu hợp lệ");
        await testAPI("POST", "/products", testData.valid, null, 401, "Valid data - no token");

        // Test 2: Dữ liệu không hợp lệ (expect 400 - validation error)
        console.log("\n📦 Test 2: Dữ liệu không hợp lệ");
        await testAPI("POST", "/products", testData.invalid, "fake-token", 400, "Invalid data - validation error");

        // Test 3: Dữ liệu rỗng (expect 400 - validation error)
        console.log("\n📦 Test 3: Dữ liệu rỗng");
        await testAPI("POST", "/products", testData.empty, "fake-token", 400, "Empty data - validation error");

        // Test 4: Thiếu dữ liệu (expect 400 - validation error)
        console.log("\n📦 Test 4: Thiếu dữ liệu");
        await testAPI("POST", "/products", testData.missing, "fake-token", 400, "Missing data - validation error");

        console.log("\n🎉 Hoàn thành test validation đã sửa!");
    } catch (error) {
        console.error("❌ Lỗi khi test:", error.message);
    }
}

// Hàm helper để test API
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
                            if (err.type) {
                                console.log(`    Type: ${err.type}`);
                            }
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

// Chạy test
if (require.main === module) {
    testFixedValidation();
}

module.exports = { testFixedValidation };
