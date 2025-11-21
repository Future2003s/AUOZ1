const axios = require("axios");

const API_BASE_URL = "http://localhost:8081/api/v1";

async function updateUserRole() {
    console.log("🔧 Updating User Role to Admin");
    console.log("🎯 Goal: Change user role from customer to admin");
    console.log("=".repeat(60));

    try {
        // First, login as admin to get token
        console.log("🔐 Logging in as admin...");
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: "admin@shopdev.com",
            password: "AdminPassword123!"
        });

        const token = loginResponse.data.data.token;
        console.log("✅ Admin login successful");

        // Get user profile to see current role
        console.log("👤 Getting user profile...");
        const profileResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        console.log("Current user role:", profileResponse.data.data.role);
        console.log("User ID:", profileResponse.data.data._id);

        // Update user role to admin
        console.log("🔄 Updating user role to admin...");
        const updateResponse = await axios.put(
            `${API_BASE_URL}/users/profile`,
            {
                role: "admin"
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("✅ User role updated successfully");
        console.log("New role:", updateResponse.data.data.role);

        // Verify the change
        console.log("✅ Verification: User role updated to admin");
        console.log("You can now use this account to create products.");
    } catch (error) {
        console.error("❌ Error updating user role:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
    }
}

// Run the function
updateUserRole();
