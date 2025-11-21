const axios = require("axios");

const API_BASE_URL = "http://localhost:8081/api/v1";

async function debugProductCreate() {
    console.log("🔍 Debug Product Creation Issues");
    console.log("🎯 Goal: Identify why product creation is failing");
    console.log("=".repeat(60));

    try {
        // Login as admin
        console.log("\n🔐 Admin Login...");
        const adminLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: "admin@shopdev.com",
            password: "AdminPassword123!"
        });

        const adminToken = adminLoginResponse.data.data.token;
        console.log(`✅ Admin login successful`);

        // Get categories and brands
        console.log("\n📂 Getting Categories and Brands...");
        const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`);
        const brandsResponse = await axios.get(`${API_BASE_URL}/brands`);

        console.log(`Categories: ${categoriesResponse.data.data.length}`);
        console.log(`Brands: ${brandsResponse.data.data.length}`);

        if (categoriesResponse.data.data.length > 0) {
            console.log(
                `First category: ${categoriesResponse.data.data[0].name} (${categoriesResponse.data.data[0]._id})`
            );
        }

        if (brandsResponse.data.data.length > 0) {
            console.log(`First brand: ${brandsResponse.data.data[0].name} (${brandsResponse.data.data[0]._id})`);
        }

        // Test product creation with detailed error logging
        console.log("\n📦 Testing Product Creation...");

        const productData = {
            name: "Debug Test Product",
            description:
                "This is a comprehensive debug test product with detailed description that meets minimum requirements",
            price: 99.99,
            sku: `DEBUG-${Date.now()}`,
            category: categoriesResponse.data.data[0]?._id || "507f1f77bcf86cd799439011",
            quantity: 10,
            brand: brandsResponse.data.data[0]?._id || "507f1f77bcf86cd799439012",
            images: [
                {
                    url: "https://example.com/debug-product.jpg",
                    alt: "Debug test product image",
                    isMain: true,
                    order: 0
                }
            ],
            tags: ["debug", "test", "product"],
            status: "active",
            isVisible: true,
            isFeatured: false,
            trackQuantity: true,
            allowBackorder: false,
            requiresShipping: true
        };

        console.log("Product data:", JSON.stringify(productData, null, 2));

        try {
            const createResponse = await axios.post(`${API_BASE_URL}/products`, productData, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    "Content-Type": "application/json"
                }
            });

            console.log("✅ Product created successfully!");
            console.log("Response:", createResponse.data);
        } catch (createError) {
            console.log("❌ Product creation failed");
            console.log("Status:", createError.response?.status);
            console.log("Error data:", JSON.stringify(createError.response?.data, null, 2));

            if (createError.response?.data?.details) {
                console.log("Validation details:", createError.response.data.details);
            }
        }

        // Test getting products
        console.log("\n📖 Testing Get Products...");
        try {
            const productsResponse = await axios.get(`${API_BASE_URL}/products`);
            console.log(`✅ Products retrieved: ${productsResponse.data.data.length} products`);

            if (productsResponse.data.data.length > 0) {
                const firstProduct = productsResponse.data.data[0];
                console.log(`First product: ${firstProduct.name} (${firstProduct._id})`);

                // Test get by ID
                console.log("\n📖 Testing Get Product by ID...");
                try {
                    const productResponse = await axios.get(`${API_BASE_URL}/products/${firstProduct._id}`);
                    console.log(`✅ Product by ID retrieved: ${productResponse.data.data.name}`);
                } catch (getError) {
                    console.log("❌ Get product by ID failed");
                    console.log("Status:", getError.response?.status);
                    console.log("Error:", JSON.stringify(getError.response?.data, null, 2));
                }
            }
        } catch (getError) {
            console.log("❌ Get products failed");
            console.log("Status:", getError.response?.status);
            console.log("Error:", JSON.stringify(getError.response?.data, null, 2));
        }
    } catch (error) {
        console.log("❌ Debug failed:", error.message);
        if (error.response) {
            console.log("Response status:", error.response.status);
            console.log("Response data:", JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log("\n" + "=".repeat(60));
}

// Run debug
debugProductCreate().catch(console.error);
