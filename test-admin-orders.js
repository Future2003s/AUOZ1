const fetch = require("node-fetch");

const BASE_URL = "http://localhost:8081/api/v1";

// Test data for admin login
const adminLoginData = {
    email: "admin@example.com", // Replace with actual admin email
    password: "password123" // Replace with actual admin password
};

async function loginAdmin() {
    try {
        console.log("🔐 Logging in admin...");

        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(adminLoginData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Admin login failed:", response.status, errorText);
            return null;
        }

        const result = await response.json();
        console.log("✅ Admin login successful");

        return result.data?.accessToken || result.accessToken || result.token;
    } catch (error) {
        console.error("❌ Admin login error:", error.message);
        return null;
    }
}

async function testGetAllOrders(token) {
    try {
        console.log("\n📋 Testing GET /orders/admin/all...");

        const response = await fetch(`${BASE_URL}/orders/admin/all?page=1&limit=10`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        console.log("Response status:", response.status);

        const result = await response.text();
        console.log("Response body:", result);

        if (response.ok) {
            const data = JSON.parse(result);
            console.log("✅ Orders retrieved successfully");
            console.log("📊 Total orders:", data.pagination?.total || data.total || 0);
            console.log("📋 Orders count:", data.data?.length || 0);
        } else {
            console.error("❌ Failed to get orders:", result);
        }

        return response.ok;
    } catch (error) {
        console.error("❌ Test error:", error.message);
        return false;
    }
}

async function testFrontendAPI() {
    try {
        console.log("\n🌐 Testing Frontend API /api/orders/admin/all...");

        const response = await fetch("http://localhost:3000/api/orders/admin/all?page=1&limit=10", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Cookie: `sessionToken=${process.env.TEST_TOKEN || "test-token"}`
            }
        });

        console.log("Frontend API status:", response.status);

        const result = await response.text();
        console.log("Frontend API response:", result);

        return response.ok;
    } catch (error) {
        console.error("❌ Frontend API error:", error.message);
        return false;
    }
}

async function runTests() {
    console.log("🚀 Starting Admin Orders API Tests...\n");

    // Test 1: Login admin
    const token = await loginAdmin();
    if (!token) {
        console.error("❌ Cannot proceed without admin token");
        return;
    }

    console.log("🔑 Admin token:", token.substring(0, 20) + "...");

    // Test 2: Test backend directly
    await testGetAllOrders(token);

    // Test 3: Test frontend API
    await testFrontendAPI();

    console.log("\n✨ Tests completed!");
}

if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testGetAllOrders, loginAdmin };
