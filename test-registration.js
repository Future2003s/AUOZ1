// Test registration without email verification
async function testRegistration() {
    try {
        const testUser = {
            firstName: "Test",
            lastName: "User",
            email: `test${Date.now()}@example.com`,
            password: "Test123456",
            phone: "+84987654321"
        };

        console.log("Testing user registration...");

        const response = await fetch("http://localhost:8081/api/v1/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(testUser)
        });

        const data = await response.json();

        if (response.status >= 400) {
            console.error("Registration failed!");
            console.error("Status:", response.status);
            console.error("Error:", data);
            return;
        }

        console.log("Registration successful!");
        console.log("Status:", response.status);
        console.log("Message:", data.message);
        console.log("Full response:", JSON.stringify(data, null, 2));

        if (data.data && data.data.user) {
            console.log("User data:", {
                id: data.data.user._id,
                email: data.data.user.email,
                isEmailVerified: data.data.user.isEmailVerified,
                isActive: data.data.user.isActive
            });
            console.log("Token received:", !!data.data.token);
        }

        // Test login immediately after registration
        console.log("\nTesting login with new account...");

        const loginResponse = await fetch("http://localhost:8081/api/v1/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });

        const loginData = await loginResponse.json();

        console.log("Login successful!");
        console.log("Status:", loginResponse.status);
        console.log("Message:", loginData.message);
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            const errorData = await error.response.json();
            console.error("Response data:", errorData);
        }
    }
}

testRegistration();
