const mongoose = require("mongoose");
require("dotenv").config();

console.log("🚀 Creating Simple Products with Valid IDs");
console.log("Database URI:", process.env.DATABASE_URI ? "Found" : "Missing");

// Simple Product Schema
const ProductSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true }, // Use string ID instead of ObjectId
        name: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        sku: { type: String, required: true, unique: true },
        quantity: { type: Number, default: 0 },
        images: [{ type: String }],
        category: { type: String, required: true },
        brand: { type: String },
        tags: [{ type: String }],
        status: { type: String, default: "active" },
        isVisible: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false }
    },
    {
        timestamps: true,
        _id: false // Disable auto-generated _id
    }
);

const CategorySchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String }
    },
    {
        timestamps: true,
        _id: false
    }
);

const BrandSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String }
    },
    {
        timestamps: true,
        _id: false
    }
);

async function createSimpleProducts() {
    console.log("📦 Creating Simple Products with String IDs");
    console.log("🎯 Goal: Add products with valid IDs for testing");
    console.log("=".repeat(60));

    try {
        // Connect to MongoDB Cloud
        console.log("🔗 Connecting to MongoDB Cloud...");
        await mongoose.connect(process.env.DATABASE_URI);
        console.log("✅ Connected to MongoDB Cloud");

        const Product = mongoose.model("Product", ProductSchema);
        const Category = mongoose.model("Category", CategorySchema);
        const Brand = mongoose.model("Brand", BrandSchema);

        // Clear existing data first
        console.log("🗑️ Clearing existing data...");
        await Product.deleteMany({});
        await Category.deleteMany({});
        await Brand.deleteMany({});
        console.log("✅ Cleared existing data");

        // Create categories with simple IDs
        console.log("📂 Creating categories...");
        const categories = await Category.insertMany([
            {
                _id: "cat-electronics",
                name: "Electronics",
                slug: "electronics",
                description: "Electronic devices and gadgets"
            },
            {
                _id: "cat-clothing",
                name: "Clothing",
                slug: "clothing",
                description: "Fashion and apparel"
            },
            {
                _id: "cat-books",
                name: "Books",
                slug: "books",
                description: "Books and literature"
            }
        ]);
        console.log(`✅ Created ${categories.length} categories`);

        // Create brands with simple IDs
        console.log("🏷️ Creating brands...");
        const brands = await Brand.insertMany([
            {
                _id: "brand-techcorp",
                name: "TechCorp",
                slug: "techcorp",
                description: "Leading technology brand"
            },
            {
                _id: "brand-fashionplus",
                name: "FashionPlus",
                slug: "fashionplus",
                description: "Premium fashion brand"
            },
            {
                _id: "brand-bookworld",
                name: "BookWorld",
                slug: "bookworld",
                description: "Quality book publisher"
            }
        ]);
        console.log(`✅ Created ${brands.length} brands`);

        // Create simple products
        console.log("📱 Creating products...");
        const products = await Product.insertMany([
            {
                _id: "prod-iphone-15",
                name: "iPhone 15 Pro Max",
                description: "Smartphone cao cấp với camera chuyên nghiệp và hiệu năng mạnh mẽ",
                price: 29990000,
                sku: "IP15PM-001",
                quantity: 50,
                images: [
                    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500",
                    "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500"
                ],
                category: "cat-electronics",
                brand: "brand-techcorp",
                tags: ["smartphone", "iphone", "apple", "5G"],
                status: "active",
                isVisible: true,
                isFeatured: true
            },
            {
                _id: "prod-samsung-s24",
                name: "Samsung Galaxy S24 Ultra",
                description: "Smartphone Android flagship với S Pen và camera zoom 100x",
                price: 26990000,
                sku: "SGS24U-001",
                quantity: 30,
                images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500"],
                category: "cat-electronics",
                brand: "brand-techcorp",
                tags: ["smartphone", "samsung", "android", "s-pen"],
                status: "active",
                isVisible: true,
                isFeatured: true
            },
            {
                _id: "prod-tshirt-basic",
                name: "Áo Thun Nam Basic",
                description: "Áo thun nam cơ bản, chất liệu cotton thoáng mát",
                price: 299000,
                sku: "SHIRT-BM-001",
                quantity: 100,
                images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"],
                category: "cat-clothing",
                brand: "brand-fashionplus",
                tags: ["áo thun", "nam", "cotton", "basic"],
                status: "active",
                isVisible: true,
                isFeatured: false
            },
            {
                _id: "prod-js-book",
                name: "Sách Lập Trình JavaScript",
                description: "Hướng dẫn học lập trình JavaScript từ cơ bản đến nâng cao",
                price: 350000,
                sku: "BOOK-JS-001",
                quantity: 75,
                images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500"],
                category: "cat-books",
                brand: "brand-bookworld",
                tags: ["sách", "lập trình", "javascript", "giáo dục"],
                status: "active",
                isVisible: true,
                isFeatured: true
            },
            {
                _id: "prod-macbook-air",
                name: "MacBook Air M2",
                description: "Laptop mỏng nhẹ với chip M2 mạnh mẽ cho công việc và sáng tạo",
                price: 31990000,
                sku: "MBA-M2-001",
                quantity: 25,
                images: ["https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500"],
                category: "cat-electronics",
                brand: "brand-techcorp",
                tags: ["laptop", "macbook", "apple", "m2"],
                status: "active",
                isVisible: true,
                isFeatured: true
            }
        ]);

        console.log(`✅ Created ${products.length} products`);

        // Display created products
        console.log("\n📋 Created Products Summary:");
        products.forEach((product, index) => {
            console.log(
                `${index + 1}. ${product.name} (ID: ${product._id}) - ${product.price.toLocaleString("vi-VN")} VND`
            );
        });

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB");

        console.log("\n🎉 Simple products created successfully!");
        console.log("📱 Test with these IDs:");
        console.log("   - http://localhost:3000/vi/products/prod-iphone-15");
        console.log("   - http://localhost:3000/vi/products/prod-samsung-s24");
        console.log("   - http://localhost:3000/vi/products/prod-tshirt-basic");
    } catch (error) {
        console.error("❌ Error creating products:", error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

createSimpleProducts();
