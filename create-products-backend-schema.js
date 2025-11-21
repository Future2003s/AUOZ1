const mongoose = require("mongoose");
require("dotenv").config();

console.log("🚀 Starting product creation with backend schema...");
console.log("Database URI:", process.env.DATABASE_URI ? "Found" : "Missing");

// Import the actual Product model from backend
const ProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, maxlength: 255 },
        description: { type: String, required: true },
        shortDescription: { type: String, maxlength: 500 },
        price: { type: Number, required: true, min: 0 },
        comparePrice: { type: Number, min: 0 },
        costPrice: { type: Number, min: 0 },
        sku: { type: String, required: true, unique: true, maxlength: 100 },
        barcode: { type: String, maxlength: 100 },
        trackQuantity: { type: Boolean, default: true },
        quantity: { type: Number, default: 0, min: 0 },
        allowBackorder: { type: Boolean, default: false },
        weight: { type: Number, min: 0 },
        dimensions: {
            length: { type: Number, min: 0 },
            width: { type: Number, min: 0 },
            height: { type: Number, min: 0 },
            unit: { type: String, enum: ["cm", "in"], default: "cm" }
        },

        // Category and Brand
        category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
        brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
        tags: [{ type: String, maxlength: 50 }],

        // Images and Media
        images: [
            {
                url: { type: String, required: true },
                alt: { type: String },
                isMain: { type: Boolean, default: false },
                order: { type: Number, default: 0 }
            }
        ],

        // Variants
        hasVariants: { type: Boolean, default: false },
        variants: [
            {
                name: { type: String, required: true },
                options: [{ type: String }]
            }
        ],

        // SEO
        seo: {
            title: { type: String, maxlength: 255 },
            description: { type: String, maxlength: 500 },
            keywords: [{ type: String }]
        },

        // Status and Visibility
        status: {
            type: String,
            enum: ["active", "draft", "archived", "out_of_stock"],
            default: "draft"
        },
        isVisible: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
        isDigital: { type: Boolean, default: false },

        // Sales and Reviews
        sold: { type: Number, default: 0, min: 0 },
        views: { type: Number, default: 0, min: 0 },
        averageRating: { type: Number, default: 0, min: 0, max: 5 },
        totalReviews: { type: Number, default: 0, min: 0 },
        totalRatings: { type: Number, default: 0, min: 0 },

        // Timestamps
        publishedAt: { type: Date },
        deletedAt: { type: Date }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

const CategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        slug: { type: String, required: true, unique: true, lowercase: true },
        description: { type: String, maxlength: 500 },
        image: {
            url: { type: String },
            alt: { type: String }
        },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
        seo: {
            title: { type: String, maxlength: 255 },
            description: { type: String, maxlength: 500 },
            keywords: [{ type: String }]
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

const BrandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        slug: { type: String, required: true, unique: true, lowercase: true },
        description: { type: String, maxlength: 500 },
        logo: {
            url: { type: String },
            alt: { type: String }
        },
        website: { type: String },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 }
    },
    {
        timestamps: true
    }
);

async function createSampleProducts() {
    console.log("📦 Creating Sample Products with Backend Schema");
    console.log("🎯 Goal: Add sample products to database for testing");
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

        // Create categories
        console.log("📂 Creating sample categories...");
        const categories = await Category.insertMany([
            {
                name: "Electronics",
                slug: "electronics",
                description: "Electronic devices and gadgets",
                isActive: true,
                sortOrder: 1,
                seo: {
                    title: "Electronics - Latest Tech Gadgets",
                    description: "Discover the latest electronic devices and tech gadgets",
                    keywords: ["electronics", "gadgets", "technology"]
                }
            },
            {
                name: "Clothing",
                slug: "clothing",
                description: "Fashion and apparel",
                isActive: true,
                sortOrder: 2,
                seo: {
                    title: "Clothing - Fashion & Apparel",
                    description: "Trendy clothing and fashion items",
                    keywords: ["clothing", "fashion", "apparel"]
                }
            },
            {
                name: "Books",
                slug: "books",
                description: "Books and literature",
                isActive: true,
                sortOrder: 3,
                seo: {
                    title: "Books - Literature & Education",
                    description: "Educational books and literature",
                    keywords: ["books", "literature", "education"]
                }
            }
        ]);
        console.log(`✅ Created ${categories.length} categories`);

        // Create brands
        console.log("🏷️ Creating sample brands...");
        const brands = await Brand.insertMany([
            {
                name: "TechCorp",
                slug: "techcorp",
                description: "Leading technology brand",
                isActive: true,
                sortOrder: 1
            },
            {
                name: "FashionPlus",
                slug: "fashionplus",
                description: "Premium fashion brand",
                isActive: true,
                sortOrder: 2
            },
            {
                name: "BookWorld",
                slug: "bookworld",
                description: "Quality book publisher",
                isActive: true,
                sortOrder: 3
            }
        ]);
        console.log(`✅ Created ${brands.length} brands`);

        // Create sample products
        console.log("📱 Creating sample products...");
        const sampleProducts = [
            {
                name: "iPhone 15 Pro Max",
                description:
                    "Smartphone cao cấp với camera chuyên nghiệp và hiệu năng mạnh mẽ. Chip A17 Pro mạnh mẽ, camera 48MP Pro với zoom quang học 5x, pin lâu dài cả ngày.",
                shortDescription: "Smartphone cao cấp với camera chuyên nghiệp",
                price: 29990000,
                comparePrice: 32990000,
                costPrice: 25000000,
                sku: "IP15PM-001",
                barcode: "1234567890123",
                trackQuantity: true,
                quantity: 50,
                allowBackorder: false,
                weight: 221,
                dimensions: {
                    length: 15.99,
                    width: 7.67,
                    height: 0.825,
                    unit: "cm"
                },
                category: categories[0]._id,
                brand: brands[0]._id,
                tags: ["smartphone", "iphone", "apple", "5G", "camera"],
                images: [
                    {
                        url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500",
                        alt: "iPhone 15 Pro Max",
                        isMain: true,
                        order: 1
                    },
                    {
                        url: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500",
                        alt: "iPhone 15 Pro Max Back",
                        isMain: false,
                        order: 2
                    }
                ],
                hasVariants: false,
                variants: [],
                seo: {
                    title: "iPhone 15 Pro Max - Apple Flagship Smartphone",
                    description: "Flagship smartphone với hiệu năng mạnh mẽ và camera chuyên nghiệp",
                    keywords: ["iphone", "apple", "smartphone", "flagship"]
                },
                status: "active",
                isVisible: true,
                isFeatured: true,
                isDigital: false,
                sold: 0,
                views: 0,
                averageRating: 4.8,
                totalReviews: 125,
                totalRatings: 125,
                publishedAt: new Date()
            },
            {
                name: "Samsung Galaxy S24 Ultra",
                description:
                    "Smartphone Android flagship với S Pen tích hợp và camera zoom 100x. Màn hình Dynamic AMOLED 2X 6.8 inch, hiệu năng mạnh mẽ với Snapdragon 8 Gen 3.",
                shortDescription: "Android flagship với S Pen và camera zoom 100x",
                price: 26990000,
                comparePrice: 29990000,
                costPrice: 22000000,
                sku: "SGS24U-001",
                barcode: "1234567890124",
                trackQuantity: true,
                quantity: 30,
                allowBackorder: false,
                weight: 232,
                dimensions: {
                    length: 16.23,
                    width: 7.9,
                    height: 0.86,
                    unit: "cm"
                },
                category: categories[0]._id,
                brand: brands[0]._id,
                tags: ["smartphone", "samsung", "android", "s-pen"],
                images: [
                    {
                        url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500",
                        alt: "Samsung Galaxy S24 Ultra",
                        isMain: true,
                        order: 1
                    }
                ],
                hasVariants: false,
                variants: [],
                seo: {
                    title: "Samsung Galaxy S24 Ultra - Android Flagship",
                    description: "Android flagship với S Pen và camera zoom 100x",
                    keywords: ["samsung", "galaxy", "android", "s-pen"]
                },
                status: "active",
                isVisible: true,
                isFeatured: true,
                isDigital: false,
                sold: 0,
                views: 0,
                averageRating: 4.7,
                totalReviews: 89,
                totalRatings: 89,
                publishedAt: new Date()
            },
            {
                name: "Áo Thun Nam Basic",
                description:
                    "Áo thun nam cơ bản, chất liệu cotton 100% thoáng mát, thấm hút mồ hôi tốt. Thiết kế đơn giản, phù hợp mặc hàng ngày hoặc tập thể thao.",
                shortDescription: "Áo thun nam cotton thoáng mát",
                price: 299000,
                comparePrice: 399000,
                costPrice: 150000,
                sku: "SHIRT-BM-001",
                barcode: "1234567890125",
                trackQuantity: true,
                quantity: 100,
                allowBackorder: true,
                weight: 200,
                dimensions: {
                    length: 70,
                    width: 50,
                    height: 2,
                    unit: "cm"
                },
                category: categories[1]._id,
                brand: brands[1]._id,
                tags: ["áo thun", "nam", "cotton", "basic"],
                images: [
                    {
                        url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
                        alt: "Áo Thun Nam Basic",
                        isMain: true,
                        order: 1
                    }
                ],
                hasVariants: true,
                variants: [
                    {
                        name: "Size",
                        options: ["S", "M", "L", "XL", "XXL"]
                    },
                    {
                        name: "Màu sắc",
                        options: ["Trắng", "Đen", "Xám", "Navy"]
                    }
                ],
                seo: {
                    title: "Áo Thun Nam Basic Cotton - Thoáng Mát",
                    description: "Áo thun nam cotton 100% thoáng mát, thiết kế basic",
                    keywords: ["áo thun", "nam", "cotton", "basic"]
                },
                status: "active",
                isVisible: true,
                isFeatured: false,
                isDigital: false,
                sold: 0,
                views: 0,
                averageRating: 4.3,
                totalReviews: 45,
                totalRatings: 45,
                publishedAt: new Date()
            },
            {
                name: "Sách Lập Trình JavaScript",
                description:
                    "Hướng dẫn học lập trình JavaScript từ cơ bản đến nâng cao. Bao gồm ES6+, DOM manipulation, async/await, và các framework hiện đại như React, Vue.",
                shortDescription: "Học JavaScript từ cơ bản đến nâng cao",
                price: 350000,
                comparePrice: 450000,
                costPrice: 200000,
                sku: "BOOK-JS-001",
                barcode: "1234567890126",
                trackQuantity: true,
                quantity: 75,
                allowBackorder: true,
                weight: 600,
                dimensions: {
                    length: 24.0,
                    width: 16.0,
                    height: 3.2,
                    unit: "cm"
                },
                category: categories[2]._id,
                brand: brands[2]._id,
                tags: ["sách", "lập trình", "javascript", "giáo dục"],
                images: [
                    {
                        url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500",
                        alt: "Sách Lập Trình JavaScript",
                        isMain: true,
                        order: 1
                    }
                ],
                hasVariants: false,
                variants: [],
                seo: {
                    title: "Sách Lập Trình JavaScript - Từ Cơ Bản Đến Nâng Cao",
                    description: "Hướng dẫn học JavaScript toàn diện với ví dụ thực tế",
                    keywords: ["javascript", "lập trình", "sách", "giáo dục"]
                },
                status: "active",
                isVisible: true,
                isFeatured: true,
                isDigital: false,
                sold: 0,
                views: 0,
                averageRating: 4.9,
                totalReviews: 67,
                totalRatings: 67,
                publishedAt: new Date()
            },
            {
                name: "MacBook Air M2",
                description:
                    "Laptop mỏng nhẹ với chip M2 mạnh mẽ cho công việc và sáng tạo. Màn hình Liquid Retina 13.6 inch, pin lên đến 18 giờ, thiết kế siêu mỏng.",
                shortDescription: "Laptop mỏng nhẹ với chip M2 mạnh mẽ",
                price: 31990000,
                comparePrice: 34990000,
                costPrice: 28000000,
                sku: "MBA-M2-001",
                barcode: "1234567890127",
                trackQuantity: true,
                quantity: 25,
                allowBackorder: false,
                weight: 1240,
                dimensions: {
                    length: 30.41,
                    width: 21.5,
                    height: 1.13,
                    unit: "cm"
                },
                category: categories[0]._id,
                brand: brands[0]._id,
                tags: ["laptop", "macbook", "apple", "m2"],
                images: [
                    {
                        url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500",
                        alt: "MacBook Air M2",
                        isMain: true,
                        order: 1
                    }
                ],
                hasVariants: true,
                variants: [
                    {
                        name: "Màu sắc",
                        options: ["Space Gray", "Silver", "Gold", "Midnight"]
                    },
                    {
                        name: "Bộ nhớ",
                        options: ["256GB", "512GB", "1TB"]
                    }
                ],
                seo: {
                    title: "MacBook Air M2 - Laptop Apple Mỏng Nhẹ",
                    description: "Laptop Apple với chip M2, thiết kế mỏng nhẹ và hiệu năng mạnh mẽ",
                    keywords: ["macbook", "apple", "laptop", "m2"]
                },
                status: "active",
                isVisible: true,
                isFeatured: true,
                isDigital: false,
                sold: 0,
                views: 0,
                averageRating: 4.6,
                totalReviews: 34,
                totalRatings: 34,
                publishedAt: new Date()
            }
        ];

        console.log(`Creating ${sampleProducts.length} products...`);
        const createdProducts = await Product.insertMany(sampleProducts);
        console.log(`✅ Created ${createdProducts.length} products`);

        // Display created products
        console.log("\n📋 Created Products Summary:");
        createdProducts.forEach((product, index) => {
            console.log(
                `${index + 1}. ${product.name} - ${product.price.toLocaleString("vi-VN")} VND - Status: ${product.status}`
            );
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
