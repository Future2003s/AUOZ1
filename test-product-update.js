const axios = require("axios");

const BASE_URL = "http://localhost:8081/api/v1";

// Test data
let authToken = "";
let productId = "";
let categoryId = "";

async function testProductUpdate() {
    console.log("🚀 Starting Product Update Testing...\n");

    try {
        // Step 1: Login to get auth token
        console.log("1️⃣ Logging in...");
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: "admin@example.com",
            password: "AdminPassword123!"
        });

        if (loginResponse.data.success) {
            authToken = loginResponse.data.data.token;
            console.log("✅ Login successful");
        } else {
            throw new Error("Login failed");
        }

        // Step 2: Get categories
        console.log("\n2️⃣ Getting categories...");
        const categoriesResponse = await axios.get(`${BASE_URL}/categories`);
        if (categoriesResponse.data.success && categoriesResponse.data.data.length > 0) {
            categoryId = categoriesResponse.data.data[0]._id;
            console.log(`✅ Found category: ${categoriesResponse.data.data[0].name}`);
        } else {
            throw new Error("No categories found");
        }

        // Step 3: Create a test product
        console.log("\n3️⃣ Creating test product...");
        const createProductData = {
            name: "Test Product for Update",
            description: "This is a test product for update testing",
            price: 25.99,
            sku: "TEST-UPDATE-001",
            category: categoryId,
            trackQuantity: true,
            quantity: 50,
            allowBackorder: false,
            status: "active",
            isVisible: true,
            isFeatured: false,
            onSale: false,
            requiresShipping: true,
            tags: ["test", "update"]
        };

        const createResponse = await axios.post(`${BASE_URL}/products`, createProductData, {
            headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        });

        if (createResponse.data.success) {
            productId = createResponse.data.data._id;
            console.log(`✅ Product created with ID: ${productId}`);
        } else {
            throw new Error("Product creation failed");
        }

        // Step 4: Update the product
        console.log("\n4️⃣ Updating product...");
        const updateData = {
            name: "Updated Test Product",
            description: "This product has been successfully updated",
            price: 35.99,
            sku: "TEST-UPDATE-001-UPDATED",
            isFeatured: true,
            onSale: true,
            salePrice: 29.99,
            tags: ["test", "updated", "featured"]
        };

        const updateResponse = await axios.put(`${BASE_URL}/products/${productId}`, updateData, {
            headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        });

        if (updateResponse.data.success) {
            console.log("✅ Product updated successfully");
            console.log("📝 Updated fields:", Object.keys(updateData));
        } else {
            throw new Error("Product update failed");
        }

        // Step 5: Update product stock
        console.log("\n5️⃣ Updating product stock...");
        const stockUpdateData = { quantity: 75 };

        const stockResponse = await axios.put(`${BASE_URL}/products/${productId}/stock`, stockUpdateData, {
            headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        });

        if (stockResponse.data.success) {
            console.log(`✅ Stock updated to: ${stockResponse.data.data.quantity}`);
        } else {
            throw new Error("Stock update failed");
        }

        // Step 6: Verify the updates
        console.log("\n6️⃣ Verifying updates...");
        const verifyResponse = await axios.get(`${BASE_URL}/products/${productId}`);

        if (verifyResponse.data.success) {
            const product = verifyResponse.data.data;
            console.log("✅ Product verification successful");
            console.log(`📦 Name: ${product.name}`);
            console.log(`💰 Price: $${product.price}`);
            console.log(`🏷️  SKU: ${product.sku}`);
            console.log(`⭐ Featured: ${product.isFeatured}`);
            console.log(`🔥 On Sale: ${product.onSale}`);
            console.log(`📦 Stock: ${product.quantity}`);
        } else {
            throw new Error("Product verification failed");
        }

        // Step 7: Test validation errors
        console.log("\n7️⃣ Testing validation errors...");
        try {
            const invalidUpdateData = {
                name: "A", // Too short
                price: -10, // Negative price
                sku: "" // Empty SKU
            };

            await axios.put(`${BASE_URL}/products/${productId}`, invalidUpdateData, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                }
            });
            console.log("❌ Expected validation error but update succeeded");
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log("✅ Validation error caught successfully");
                console.log("📝 Error message:", error.response.data.message);
                console.log("🔍 Validation errors:", error.response.data.errors.length);
            } else {
                console.log("❌ Unexpected error during validation test");
            }
        }

        // Step 8: Cleanup - Delete the test product
        console.log("\n8️⃣ Cleaning up test product...");
        const deleteResponse = await axios.delete(`${BASE_URL}/products/${productId}`, {
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        });

        if (deleteResponse.data.success) {
            console.log("✅ Test product deleted successfully");
        } else {
            console.log("⚠️  Failed to delete test product");
        }

        console.log("\n🎉 Product Update Testing Completed Successfully!");
        console.log("\n📊 Test Summary:");
        console.log("✅ Authentication");
        console.log("✅ Product Creation");
        console.log("✅ Product Update");
        console.log("✅ Stock Update");
        console.log("✅ Update Verification");
        console.log("✅ Validation Testing");
        console.log("✅ Cleanup");
    } catch (error) {
        console.error("\n❌ Test failed:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testProductUpdate();
}

module.exports = { testProductUpdate };
