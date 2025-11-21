const axios = require("axios");

const BASE_URL = "http://localhost:8081/api/v1";
const TEST_TOKEN = "your-test-token-here"; // Replace with actual token

const testOrderData = {
    amount: 380000,
    description: "1 sản phẩm - Người mua: Phạm Sáng - ĐT: 0865236219",
    items: [
        {
            name: "Mật Ong Hoa Vải 435g",
            quantity: 1,
            price: 380000
        }
    ],
    customer: {
        fullName: "Phạm Sáng",
        phone: "0865236219",
        email: "phamsang1210z9@gmail.com",
        address: "Thôn Tú Y, Xã Hà Đông, Thành Phố Hải Phòng",
        note: "Giao giờ hành chính"
    },
    paymentMethod: "cod"
};

async function testCreateOrder() {
    try {
        console.log("🧪 Testing Create Order API (Guest Checkout)...");
        console.log("📤 Sending data:", JSON.stringify(testOrderData, null, 2));

        const response = await axios.post(`${BASE_URL}/orders/guest`, testOrderData, {
            headers: {
                "Content-Type": "application/json"
                // No Authorization header needed for guest checkout
            }
        });

        console.log("✅ Success!");
        console.log("📊 Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
        if (error.response) {
            console.error("📊 Status:", error.response.status);
            console.error("📋 Headers:", error.response.headers);
        }
    }
}

async function testCreateOrderWithAuth() {
    try {
        console.log("\n🧪 Testing Create Order API (With Auth)...");
        console.log("📤 Sending data:", JSON.stringify(testOrderData, null, 2));

        const response = await axios.post(`${BASE_URL}/orders`, testOrderData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${TEST_TOKEN}`
            }
        });

        console.log("✅ Success!");
        console.log("📊 Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
        if (error.response) {
            console.error("📊 Status:", error.response.status);
        }
    }
}

async function testGetOrders() {
    try {
        console.log("\n🧪 Testing Get Orders API...");

        const response = await axios.get(`${BASE_URL}/orders`, {
            headers: {
                Authorization: `Bearer ${TEST_TOKEN}`
            }
        });

        console.log("✅ Success!");
        console.log("📊 Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
    }
}

async function runTests() {
    console.log("🚀 Starting Orders API Tests...\n");

    await testCreateOrder(); // Guest checkout
    await testCreateOrderWithAuth(); // With authentication
    await testGetOrders(); // Get user orders

    console.log("\n✨ Tests completed!");
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testCreateOrder, testCreateOrderWithAuth, testGetOrders };
