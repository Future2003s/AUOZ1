const axios = require("axios");

const BASE_URL = "http://localhost:8081/api/v1";

async function testOrderHistory() {
    try {
        console.log("🧪 Testing Order History API...\n");

        // Test 1: Get order history for a specific order
        console.log("1️⃣ Testing GET /orders/ORD001/history");
        const historyResponse = await axios.get(`${BASE_URL}/orders/ORD001/history`, {
            headers: {
                Authorization: "Bearer YOUR_ADMIN_TOKEN_HERE" // Replace with actual admin token
            }
        });

        console.log("✅ Response:", {
            status: historyResponse.status,
            data: historyResponse.data
        });

        // Test 2: Update order status to create new history entry
        console.log("\n2️⃣ Testing PUT /orders/ORD001/status");
        const updateResponse = await axios.put(
            `${BASE_URL}/orders/ORD001/status`,
            {
                status: "DELIVERED",
                note: "Đơn hàng đã được giao thành công!"
            },
            {
                headers: {
                    Authorization: "Bearer YOUR_ADMIN_TOKEN_HERE", // Replace with actual admin token
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("✅ Response:", {
            status: updateResponse.status,
            data: updateResponse.data
        });

        // Test 3: Get updated order history
        console.log("\n3️⃣ Testing GET /orders/ORD001/history (after update)");
        const updatedHistoryResponse = await axios.get(`${BASE_URL}/orders/ORD001/history`, {
            headers: {
                Authorization: "Bearer YOUR_ADMIN_TOKEN_HERE" // Replace with actual admin token
            }
        });

        console.log("✅ Response:", {
            status: updatedHistoryResponse.status,
            data: updatedHistoryResponse.data
        });
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
    }
}

// Run the test
testOrderHistory();
