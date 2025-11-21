const axios = require("axios");

const API_BASE_URL = "http://localhost:8081/api/v1";

async function createSampleProducts() {
    console.log("📦 Creating Sample Products for Testing");
    console.log("🎯 Goal: Add sample products to database for CRUD testing");
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

        // Set auth header for subsequent requests
        const authHeaders = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        };

        // First, create categories
        console.log("📂 Creating sample categories...");
        const categories = await Promise.all([
            axios.post(
                `${API_BASE_URL}/categories`,
                {
                    name: "Electronics",
                    slug: "electronics",
                    description: "Electronic devices and gadgets"
                },
                { headers: authHeaders }
            ),
            axios.post(
                `${API_BASE_URL}/categories`,
                {
                    name: "Clothing",
                    slug: "clothing",
                    description: "Fashion and apparel"
                },
                { headers: authHeaders }
            ),
            axios.post(
                `${API_BASE_URL}/categories`,
                {
                    name: "Books",
                    slug: "books",
                    description: "Books and literature"
                },
                { headers: authHeaders }
            )
        ]);

        console.log(`✅ Created ${categories.length} categories`);

        // Create brands
        console.log("🏷️ Creating sample brands...");
        const brands = await Promise.all([
            axios.post(
                `${API_BASE_URL}/brands`,
                {
                    name: "TechCorp",
                    slug: "techcorp",
                    description: "Leading technology brand"
                },
                { headers: authHeaders }
            ),
            axios.post(
                `${API_BASE_URL}/brands`,
                {
                    name: "FashionPlus",
                    slug: "fashionplus",
                    description: "Premium fashion brand"
                },
                { headers: authHeaders }
            ),
            axios.post(
                `${API_BASE_URL}/brands`,
                {
                    name: "BookWorld",
                    slug: "bookworld",
                    description: "Quality book publisher"
                },
                { headers: authHeaders }
            )
        ]);

        console.log(`✅ Created ${brands.length} brands`);

        // Create sample products
        console.log("📱 Creating sample products...");
        const sampleProducts = [
            {
                name: "Sample Smartphone",
                slug: "sample-smartphone",
                description: "A high-quality smartphone for testing purposes",
                price: 599.99,
                compareAtPrice: 699.99,
                sku: "PHONE-001",
                barcode: "1234567890123",
                trackQuantity: true,
                quantity: 100,
                sold: 0,
                images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500"],
                category: categories[0].data.data._id,
                brand: brands[0].data.data._id,
                tags: ["smartphone", "5G", "camera"],
                status: "active",
                featured: true,
                specifications: {
                    screen: "6.1 inch",
                    storage: "128GB",
                    ram: "8GB"
                },
                weight: 180,
                dimensions: {
                    length: 15.5,
                    width: 7.5,
                    height: 0.8
                },
                rating: 4.5,
                numReviews: 25
            },
            {
                name: "Sample T-Shirt",
                slug: "sample-t-shirt",
                description: "Comfortable cotton t-shirt for everyday wear",
                price: 29.99,
                compareAtPrice: 39.99,
                sku: "SHIRT-001",
                barcode: "1234567890124",
                trackQuantity: true,
                quantity: 200,
                sold: 0,
                images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"],
                category: categories[1].data.data._id,
                brand: brands[1].data.data._id,
                tags: ["clothing", "cotton", "casual"],
                status: "active",
                featured: false,
                specifications: {
                    material: "Cotton",
                    fit: "Regular",
                    care: "Machine wash cold"
                },
                weight: 150,
                dimensions: {
                    length: 70,
                    width: 50,
                    height: 2
                },
                rating: 4.2,
                numReviews: 18
            },
            {
                name: "Sample Programming Book",
                slug: "sample-programming-book",
                description: "Learn programming with this comprehensive guide",
                price: 49.99,
                compareAtPrice: 59.99,
                sku: "BOOK-001",
                barcode: "1234567890125",
                trackQuantity: true,
                quantity: 150,
                sold: 0,
                images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500"],
                category: categories[2].data.data._id,
                brand: brands[2].data.data._id,
                tags: ["book", "programming", "education"],
                status: "active",
                featured: true,
                specifications: {
                    pages: "450",
                    language: "English",
                    format: "Paperback"
                },
                weight: 800,
                dimensions: {
                    length: 23.5,
                    width: 15.5,
                    height: 2.5
                },
                rating: 4.8,
                numReviews: 32
            }
        ];

        const createdProducts = await Promise.all(
            sampleProducts.map((product) => axios.post(`${API_BASE_URL}/products`, product, { headers: authHeaders }))
        );

        console.log(`✅ Created ${createdProducts.length} products`);

        // Display created products
        console.log("\n📋 Created Products Summary:");
        createdProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.data.data.name} - $${product.data.data.price}`);
        });

        console.log("\n🎉 Sample products created successfully!");
        console.log("You can now test the products API endpoints.");
    } catch (error) {
        console.error("❌ Error creating sample products:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
    }
}

// Run the function
createSampleProducts();
