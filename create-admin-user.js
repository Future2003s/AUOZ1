const fetch = require("node-fetch");

const API_BASE_URL = "http://localhost:8081/api/v1";

async function createAdminUser() {
    console.log("👤 Creating Admin User for Product CRUD Testing");
    console.log("🎯 Goal: Create admin user to test product management endpoints");
    console.log("=".repeat(60));

    try {
        // Create admin user via API
        console.log("📝 Creating admin user...");
        const adminResponse = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                firstName: "Admin",
                lastName: "User",
                email: "admin@example.com",
                password: "password123",
                phone: "+1234567890",
                role: "admin"
            })
        });

        const adminData = await adminResponse.json();
        console.log("✅ Admin user created successfully");
        console.log("Response data:", JSON.stringify(adminData, null, 2));
        console.log(`   Email: ${adminData.data?.email || "N/A"}`);
        console.log(`   Role: ${adminData.data?.role || "N/A"}`);
        console.log(`   ID: ${adminData.data?._id || "N/A"}`);

        // Create seller user via API
        console.log("📝 Creating seller user...");
        const sellerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                firstName: "Seller",
                lastName: "User",
                email: "seller@example.com",
                password: "password123",
                phone: "+1234567891",
                role: "seller"
            })
        });

        const sellerData = await sellerResponse.json();
        console.log("✅ Seller user created successfully");
        console.log("Response data:", JSON.stringify(sellerData, null, 2));
        console.log(`   Email: ${sellerData.data?.email || "N/A"}`);
        console.log(`   Role: ${sellerData.data?.role || "N/A"}`);
        console.log(`   ID: ${sellerData.data?._id || "N/A"}`);

        console.log("\n" + "=".repeat(60));
        console.log("🎉 Admin and Seller users ready!");
        console.log("📋 You can now use these credentials to test admin endpoints");
        console.log("=".repeat(60));
    } catch (error) {
        console.error("❌ Error creating admin user:", error.message);
    }
}

// Run the function
createAdminUser();
