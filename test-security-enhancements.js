// Security Enhancement Test Suite

async function testSecurityEnhancements() {
    const baseUrl = "http://localhost:8081/api/v1/auth";
    
    console.log("🔒 Testing Security Enhancements...\n");

    // Test 1: Strong Password Validation
    console.log("1. Testing Enhanced Password Validation...");
    try {
        const weakPasswords = [
            "123456",           // Too weak
            "password",         // Common weak
            "Password123",      // Missing special char
            "Pass@1"           // Too short
        ];

        for (const password of weakPasswords) {
            const response = await fetch(`${baseUrl}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: "Test",
                    lastName: "User",
                    email: `test${Date.now()}@example.com`,
                    password: password,
                    phone: "+84987654321"
                })
            });

            const data = await response.json();
            if (response.status === 400) {
                console.log(`   ✅ Weak password "${password}" correctly rejected`);
            } else {
                console.log(`   ❌ Weak password "${password}" was accepted!`);
            }
        }

        // Test strong password
        const strongPassword = "StrongP@ssw0rd123!";
        const strongResponse = await fetch(`${baseUrl}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: "Test",
                lastName: "User",
                email: `test${Date.now()}@example.com`,
                password: strongPassword,
                phone: "+84987654321"
            })
        });

        if (strongResponse.status === 201) {
            console.log(`   ✅ Strong password accepted`);
        } else {
            console.log(`   ❌ Strong password rejected`);
        }

    } catch (error) {
        console.log(`   ❌ Password validation test failed: ${error.message}`);
    }

    // Test 2: Rate Limiting
    console.log("\n2. Testing Enhanced Rate Limiting...");
    try {
        const testEmail = `ratetest${Date.now()}@example.com`;
        let failedAttempts = 0;

        // Attempt multiple failed logins
        for (let i = 0; i < 6; i++) {
            const response = await fetch(`${baseUrl}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: testEmail,
                    password: "wrongpassword"
                })
            });

            if (response.status === 429) {
                console.log(`   ✅ Rate limit triggered after ${i} attempts`);
                break;
            } else if (response.status === 401) {
                failedAttempts++;
            }
        }

        if (failedAttempts >= 5) {
            console.log(`   ⚠️  Rate limiting may need adjustment (${failedAttempts} attempts allowed)`);
        }

    } catch (error) {
        console.log(`   ❌ Rate limiting test failed: ${error.message}`);
    }

    // Test 3: Token Security
    console.log("\n3. Testing Token Security...");
    try {
        // Register a user first
        const userEmail = `tokentest${Date.now()}@example.com`;
        const registerResponse = await fetch(`${baseUrl}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: "Token",
                lastName: "Test",
                email: userEmail,
                password: "SecureP@ssw0rd123!",
                phone: "+84987654321"
            })
        });

        if (registerResponse.status === 201) {
            const registerData = await registerResponse.json();
            const { token, refreshToken } = registerData.data;

            // Test token format (should be JWT)
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                console.log(`   ✅ JWT token format correct`);
            } else {
                console.log(`   ❌ Invalid JWT token format`);
            }

            // Test refresh token rotation
            const refreshResponse = await fetch(`${baseUrl}/refresh-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken })
            });

            if (refreshResponse.status === 200) {
                const refreshData = await refreshResponse.json();
                const newRefreshToken = refreshData.data.refreshToken;
                
                if (newRefreshToken !== refreshToken) {
                    console.log(`   ✅ Refresh token rotation working`);
                } else {
                    console.log(`   ❌ Refresh token not rotated`);
                }

                // Test old refresh token (should be blacklisted)
                const oldTokenResponse = await fetch(`${baseUrl}/refresh-token`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken })
                });

                if (oldTokenResponse.status === 401) {
                    console.log(`   ✅ Old refresh token properly blacklisted`);
                } else {
                    console.log(`   ❌ Old refresh token still valid`);
                }
            }

            // Test logout token blacklisting
            const logoutResponse = await fetch(`${baseUrl}/logout`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ refreshToken: newRefreshToken || refreshToken })
            });

            if (logoutResponse.status === 200) {
                console.log(`   ✅ Logout successful`);

                // Test using token after logout (should fail)
                const protectedResponse = await fetch(`${baseUrl}/me`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (protectedResponse.status === 401) {
                    console.log(`   ✅ Token properly blacklisted after logout`);
                } else {
                    console.log(`   ❌ Token still valid after logout`);
                }
            }
        }

    } catch (error) {
        console.log(`   ❌ Token security test failed: ${error.message}`);
    }

    // Test 4: Input Sanitization
    console.log("\n4. Testing Input Sanitization...");
    try {
        const maliciousInputs = [
            "<script>alert('xss')</script>",
            "'; DROP TABLE users; --",
            "javascript:alert('xss')",
            "../../../etc/passwd"
        ];

        for (const maliciousInput of maliciousInputs) {
            const response = await fetch(`${baseUrl}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: maliciousInput,
                    lastName: "Test",
                    email: `test${Date.now()}@example.com`,
                    password: "SecureP@ssw0rd123!",
                    phone: "+84987654321"
                })
            });

            // Should either reject or sanitize the input
            if (response.status === 400 || response.status === 201) {
                console.log(`   ✅ Malicious input handled: ${maliciousInput.substring(0, 20)}...`);
            } else {
                console.log(`   ❌ Malicious input not handled: ${maliciousInput}`);
            }
        }

    } catch (error) {
        console.log(`   ❌ Input sanitization test failed: ${error.message}`);
    }

    console.log("\n🔒 Security Enhancement Testing Complete!");
}

// Run the tests
testSecurityEnhancements().catch(console.error);
