const mongoose = require("mongoose");
require("dotenv").config();

console.log("🚀 Starting product creation script...");
console.log("Database URI:", process.env.DATABASE_URI ? "Found" : "Missing");

// Product Schema - matching backend model
const ProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        compareAtPrice: { type: Number },
        cost: { type: Number },
        sku: { type: String, required: true, unique: true },
        barcode: { type: String },
        trackQuantity: { type: Boolean, default: true },
        quantity: { type: Number, default: 0 },
        sold: { type: Number, default: 0 },
        images: [{ type: String }],
        category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
        brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
        tags: [{ type: String }],
        status: { type: String, enum: ["active", "draft", "archived"], default: "active" },
        featured: { type: Boolean, default: false },
        specifications: { type: mongoose.Schema.Types.Mixed },
        weight: { type: Number },
        dimensions: {
            length: { type: Number },
            width: { type: Number },
            height: { type: Number }
        },
        rating: { type: Number, default: 0 },
        numReviews: { type: Number, default: 0 }
    },
    {
        timestamps: true
    }
);

const CategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String },
        image: { type: String },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

const BrandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String },
        logo: { type: String },
        website: { type: String },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

async function createSampleProducts() {
    console.log("📦 Creating Sample Products Directly in MongoDB");
    console.log("🎯 Goal: Add sample products to database for testing");
    console.log("=".repeat(60));

    try {
        // Connect to MongoDB Cloud
        console.log("🔗 Connecting to MongoDB Cloud...");
        console.log("Connection string:", process.env.DATABASE_URI.substring(0, 50) + "...");

        await mongoose.connect(process.env.DATABASE_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
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

        // Create categories
        console.log("📂 Creating sample categories...");
        const categories = await Category.insertMany([
            {
                name: "Electronics",
                slug: "electronics",
                description: "Electronic devices and gadgets",
                isActive: true
            },
            {
                name: "Clothing",
                slug: "clothing",
                description: "Fashion and apparel",
                isActive: true
            },
            {
                name: "Books",
                slug: "books",
                description: "Books and literature",
                isActive: true
            }
        ]);
        console.log(`✅ Created ${categories.length} categories`);
        categories.forEach((cat) => console.log(`   - ${cat.name} (${cat._id})`));

        // Create brands
        console.log("🏷️ Creating sample brands...");
        const brands = await Brand.insertMany([
            {
                name: "TechCorp",
                slug: "techcorp",
                description: "Leading technology brand",
                isActive: true
            },
            {
                name: "FashionPlus",
                slug: "fashionplus",
                description: "Premium fashion brand",
                isActive: true
            },
            {
                name: "BookWorld",
                slug: "bookworld",
                description: "Quality book publisher",
                isActive: true
            }
        ]);
        console.log(`✅ Created ${brands.length} brands`);
        brands.forEach((brand) => console.log(`   - ${brand.name} (${brand._id})`));

        // Create sample products
        console.log("📱 Creating sample products...");
        const sampleProducts = [
            {
                name: "iPhone 15 Pro Max",
                slug: "iphone-15-pro-max",
                description: "Smartphone cao cấp với camera chuyên nghiệp và hiệu năng mạnh mẽ",
                price: 29990000,
                compareAtPrice: 32990000,
                sku: "IP15PM-001",
                barcode: "1234567890123",
                trackQuantity: true,
                quantity: 50,
                sold: 0,
                images: [
                    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500",
                    "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500"
                ],
                category: categories[0]._id,
                brand: brands[0]._id,
                tags: ["smartphone", "iphone", "apple", "5G", "camera"],
                status: "active",
                featured: true,
                specifications: {
                    screen: "6.7 inch Super Retina XDR",
                    storage: "256GB",
                    ram: "8GB",
                    camera: "48MP Pro camera system",
                    battery: "4422 mAh",
                    os: "iOS 17"
                },
                weight: 221,
                dimensions: {
                    length: 159.9,
                    width: 76.7,
                    height: 8.25
                },
                rating: 4.8,
                numReviews: 125
            },
            {
                name: "Samsung Galaxy S24 Ultra",
                slug: "samsung-galaxy-s24-ultra",
                description: "Smartphone Android flagship với S Pen và camera zoom 100x",
                price: 26990000,
                compareAtPrice: 29990000,
                sku: "SGS24U-001",
                barcode: "1234567890124",
                trackQuantity: true,
                quantity: 30,
                sold: 0,
                images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500"],
                category: categories[0]._id,
                brand: brands[0]._id,
                tags: ["smartphone", "samsung", "android", "s-pen"],
                status: "active",
                featured: true,
                specifications: {
                    screen: "6.8 inch Dynamic AMOLED 2X",
                    storage: "512GB",
                    ram: "12GB",
                    camera: "200MP main camera",
                    battery: "5000 mAh"
                },
                weight: 232,
                dimensions: {
                    length: 162.3,
                    width: 79.0,
                    height: 8.6
                },
                rating: 4.7,
                numReviews: 89
            },
            {
                name: "Áo Thun Nam Basic",
                slug: "ao-thun-nam-basic",
                description: "Áo thun nam cơ bản, chất liệu cotton thoáng mát",
                price: 299000,
                compareAtPrice: 399000,
                sku: "SHIRT-BM-001",
                barcode: "1234567890125",
                trackQuantity: true,
                quantity: 100,
                sold: 0,
                images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"],
                category: categories[1]._id,
                brand: brands[1]._id,
                tags: ["áo thun", "nam", "cotton", "basic"],
                status: "active",
                featured: false,
                specifications: {
                    material: "100% Cotton",
                    fit: "Regular fit",
                    care: "Machine wash cold",
                    sizes: "S, M, L, XL, XXL"
                },
                weight: 200,
                dimensions: {
                    length: 70,
                    width: 50,
                    height: 2
                },
                rating: 4.3,
                numReviews: 45
            },
            {
                name: "Sách Lập Trình JavaScript",
                slug: "sach-lap-trinh-javascript",
                description: "Hướng dẫn học lập trình JavaScript từ cơ bản đến nâng cao",
                price: 350000,
                compareAtPrice: 450000,
                sku: "BOOK-JS-001",
                barcode: "1234567890126",
                trackQuantity: true,
                quantity: 75,
                sold: 0,
                images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500"],
                category: categories[2]._id,
                brand: brands[2]._id,
                tags: ["sách", "lập trình", "javascript", "giáo dục"],
                status: "active",
                featured: true,
                specifications: {
                    pages: "520",
                    language: "Tiếng Việt",
                    format: "Paperback",
                    publisher: "BookWorld Publishing",
                    isbn: "978-0123456789"
                },
                weight: 600,
                dimensions: {
                    length: 24.0,
                    width: 16.0,
                    height: 3.2
                },
                rating: 4.9,
                numReviews: 67
            },
            {
                name: "MacBook Air M2",
                slug: "macbook-air-m2",
                description: "Laptop mỏng nhẹ với chip M2 mạnh mẽ cho công việc và sáng tạo",
                price: 31990000,
                compareAtPrice: 34990000,
                sku: "MBA-M2-001",
                barcode: "1234567890127",
                trackQuantity: true,
                quantity: 25,
                sold: 0,
                images: ["https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500"],
                category: categories[0]._id,
                brand: brands[0]._id,
                tags: ["laptop", "macbook", "apple", "m2"],
                status: "active",
                featured: true,
                specifications: {
                    screen: "13.6 inch Liquid Retina",
                    processor: "Apple M2 chip",
                    ram: "8GB",
                    storage: "256GB SSD",
                    battery: "Up to 18 hours"
                },
                weight: 1240,
                dimensions: {
                    length: 30.41,
                    width: 21.5,
                    height: 1.13
                },
                rating: 4.6,
                numReviews: 34
            }
        ];

        console.log(`Creating ${sampleProducts.length} products...`);
        const createdProducts = await Product.insertMany(sampleProducts);
        console.log(`✅ Created ${createdProducts.length} products`);

        // Display created products
        console.log("\n📋 Created Products Summary:");
        createdProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - ${product.price.toLocaleString("vi-VN")} VND`);
        });

        // Verify products in database
        const totalProducts = await Product.countDocuments();
        console.log(`\n📊 Total products in database: ${totalProducts}`);

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB");

        console.log("\n🎉 Sample products created successfully!");
        console.log("📱 You can now visit http://localhost:3000/vi/products to see the products");
    } catch (error) {
        console.error("❌ Error creating sample products:", error.message);
        console.error("Full error:", error);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

// Run the function
createSampleProducts()
    .then(() => {
        console.log("✅ Script completed successfully");
    })
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
