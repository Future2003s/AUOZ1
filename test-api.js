const axios = require("axios");

async function testProductsAPI() {
    console.log("🧪 Testing Products API");
    console.log("=".repeat(40));

    try {
        // Test 1: Get all products without filters
        console.log("1. Testing GET /products (no filters):");
        const response1 = await axios.get("http://localhost:8081/api/v1/products");
        console.log(`   Status: ${response1.status}`);
        console.log(`   Products count: ${response1.data.data.length}`);
        console.log(`   Total: ${response1.data.pagination.total}`);

        // Test 2: Get products with status=active
        console.log("\n2. Testing GET /products?status=active:");
        const response2 = await axios.get("http://localhost:8081/api/v1/products?status=active");
        console.log(`   Status: ${response2.status}`);
        console.log(`   Products count: ${response2.data.data.length}`);
        console.log(`   Total: ${response2.data.pagination.total}`);

        // Test 3: Get products with isVisible=true
        console.log("\n3. Testing GET /products?isVisible=true:");
        const response3 = await axios.get("http://localhost:8081/api/v1/products?isVisible=true");
        console.log(`   Status: ${response3.status}`);
        console.log(`   Products count: ${response3.data.data.length}`);
        console.log(`   Total: ${response3.data.pagination.total}`);

        // Test 4: Get products with both status=active and isVisible=true
        console.log("\n4. Testing GET /products?status=active&isVisible=true:");
        const response4 = await axios.get("http://localhost:8081/api/v1/products?status=active&isVisible=true");
        console.log(`   Status: ${response4.status}`);
        console.log(`   Products count: ${response4.data.data.length}`);
        console.log(`   Total: ${response4.data.pagination.total}`);

        if (response4.data.data.length > 0) {
            console.log("\n📋 First product details:");
            const product = response4.data.data[0];
            console.log(`   Name: ${product.name}`);
            console.log(`   Price: ${product.price}`);
            console.log(`   Status: ${product.status}`);
            console.log(`   Is Visible: ${product.isVisible}`);
        }

        // Test 5: Get featured products
        console.log("\n5. Testing GET /products/featured:");
        try {
            const response5 = await axios.get("http://localhost:8081/api/v1/products/featured");
            console.log(`   Status: ${response5.status}`);
            console.log(`   Featured products count: ${response5.data.data.length}`);
        } catch (error) {
            console.log(`   Error: ${error.response?.status || error.message}`);
        }
    } catch (error) {
        console.error("❌ API Test Error:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
    }
}

testProductsAPI();
