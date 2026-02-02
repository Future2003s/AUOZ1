"use strict";
/**
 * Seed script for 4 Nước Ép Vải products
 * Run: npx ts-node src/scripts/seed-nuoc-ep-vai-products.ts
 *
 * IMAGES:
 * - Replace the placeholder URLs in PRODUCT_IMAGES with your actual product image URLs
 * - Images should be hosted on a CDN or your server
 * - Recommended size: 1200x1200px or larger
 * - Format: JPG, PNG, or WebP
 * - Each product can have multiple images (main image + additional images)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLUG_ALIASES = exports.COMMON_DATA = exports.PRODUCTS = void 0;
exports.seedProducts = seedProducts;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = require("../models/Product");
const Category_1 = require("../models/Category");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const database_1 = require("../config/database");
const product_images_config_1 = require("./product-images.config");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Slug alias mapping for backward compatibility
const SLUG_ALIASES = {
    "nuoc-cot-vai-100": "nuoc-ep-vai-thieu"
};
exports.SLUG_ALIASES = SLUG_ALIASES;
// Helper function to generate slug from Vietnamese name
const slugify = (text) => {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
};
// Common data for all 4 products
const COMMON_DATA = {
    ingredients: "Thành Phần: 98% Nước Ép Vải, 2% Nước Ép Chanh",
    nutrition: {
        energyKcal: 64,
        proteinG: 0,
        fatG: 0,
        totalSugarG: 16,
        sugarRangeG: "15-16",
        sodiumMg: 1
    },
    volumeMl: 250,
    supervisedBy: "MASATOSHI OZAKI - Chuyên gia công nghệ chế biến thực phẩm",
    claims: [
        "Không chất bảo quản",
        "Không Thêm Đường",
        "Không Thêm Nước"
    ],
    description: `Nước ép vải nguyên chất từ vải thiều Thanh Hà – thơm ngọt tự nhiên, không chất bảo quản, không thêm đường, không thêm nước. Sản phẩm được giám sát bởi MASATOSHI OZAKI – Chuyên gia công nghệ chế biến thực phẩm.

Thành Phần: 98% Nước Ép Vải, 2% Nước Ép Chanh

Bảng dinh dưỡng (trên 250ml):
- Năng Lượng: 64Kcal
- Chất Đạm: 0g
- Chất Béo Tổng Hợp: 0g
- Chất Đường Tổng: 16g
- Tổng Lượng Đường: 15–16g
- Natri: 1mg

Dung tích: 250ml

Tiêu chí 3 Không:
- Không chất bảo quản
- Không Thêm Đường
- Không Thêm Nước`,
    shortDescription: "Nước ép vải nguyên chất từ vải thiều Thanh Hà – thơm ngọt tự nhiên, không chất bảo quản.",
    currency: "VND",
    status: "active",
    isVisible: true,
    isFeatured: true,
    onSale: false,
    trackQuantity: true,
    quantity: 100,
    allowBackorder: false,
    requiresShipping: true,
    hasVariants: false,
    averageRating: 5,
    reviewCount: 0,
    tags: ["nước ép vải", "vải thiều", "thanh hà", "tự nhiên", "không chất bảo quản", "250ml"]
};
exports.COMMON_DATA = COMMON_DATA;
// Images are now managed in product-images.config.ts
// Import getProductImages function to get images for each product
// 4 products to create/update
const PRODUCTS = [
    {
        name: "Nước Ép Vải Thiều",
        slug: "nuoc-ep-vai-thieu",
        price: 75000,
        sku: "NEV-THIEU-250ML"
    },
    {
        name: "Nước Ép Vải Phối Trộn",
        slug: "nuoc-ep-vai-phoi-tron",
        price: 80000,
        sku: "NEV-PHOI-TRON-250ML"
    },
    {
        name: "Nước Ép Vải Tàu Lai",
        slug: "nuoc-ep-vai-tau-lai",
        price: 80000,
        sku: "NEV-TAU-LAI-250ML"
    },
    {
        name: "Nước Ép Vải U Hồng",
        slug: "nuoc-ep-vai-u-hong",
        price: 95000,
        sku: "NEV-U-HONG-250ML"
    }
];
exports.PRODUCTS = PRODUCTS;
async function seedProducts() {
    try {
        // Connect to MongoDB using database config
        await (0, database_1.connectDatabase)();
        logger_1.logger.info("✅ Connected to MongoDB");
        // Get or create a default admin user for createdBy
        let adminUser = await User_1.User.findOne({ role: "admin" });
        if (!adminUser) {
            adminUser = await User_1.User.findOne();
            if (!adminUser) {
                throw new Error("No user found in database. Please create a user first.");
            }
        }
        // Get a default category (or create one if needed)
        let category = await Category_1.Category.findOne({ name: { $regex: /nước|nuoc|ép|ep|vải|vai/i } });
        if (!category) {
            category = await Category_1.Category.findOne();
            if (!category) {
                throw new Error("No category found in database. Please create a category first.");
            }
        }
        logger_1.logger.info(`📦 Using category: ${category.name}`);
        logger_1.logger.info(`👤 Using user: ${adminUser.email || adminUser._id}`);
        // Process each product
        for (const productData of PRODUCTS) {
            const slug = productData.slug;
            const existingProduct = await Product_1.Product.findOne({ slug });
            // Get images for this product, use existing images if available, otherwise use images from config
            const productImages = existingProduct?.images && existingProduct.images.length > 0
                ? existingProduct.images
                : (0, product_images_config_1.getProductImages)(slug);
            const productPayload = {
                ...COMMON_DATA,
                ...productData,
                category: category._id,
                createdBy: adminUser._id,
                images: productImages
            };
            if (existingProduct) {
                // Update existing product
                await Product_1.Product.findByIdAndUpdate(existingProduct._id, {
                    ...productPayload,
                    updatedBy: adminUser._id
                }, { new: true, runValidators: true });
                logger_1.logger.info(`✅ Updated: ${productData.name} (${slug})`);
            }
            else {
                // Create new product
                await Product_1.Product.create(productPayload);
                logger_1.logger.info(`✅ Created: ${productData.name} (${slug})`);
            }
        }
        // Handle slug alias: Update or create alias mapping
        // We'll store this in a separate collection or use a lookup table
        // For now, we'll update the old product if it exists
        const oldSlug = "nuoc-cot-vai-100";
        const newSlug = SLUG_ALIASES[oldSlug];
        if (newSlug) {
            const oldProduct = await Product_1.Product.findOne({ slug: oldSlug });
            const newProduct = await Product_1.Product.findOne({ slug: newSlug });
            if (oldProduct && !newProduct) {
                // Update old product to new slug
                await Product_1.Product.findByIdAndUpdate(oldProduct._id, {
                    slug: newSlug,
                    name: "Nước Ép Vải Thiều",
                    price: 75000,
                    sku: "NEV-THIEU-250ML",
                    updatedBy: adminUser._id
                });
                logger_1.logger.info(`✅ Migrated old product from ${oldSlug} to ${newSlug}`);
            }
            else if (oldProduct && newProduct && oldProduct._id.toString() !== newProduct._id.toString()) {
                // Archive old product
                await Product_1.Product.findByIdAndUpdate(oldProduct._id, {
                    status: "archived",
                    isVisible: false,
                    updatedBy: adminUser._id
                });
                logger_1.logger.info(`✅ Archived old product: ${oldSlug}`);
            }
        }
        logger_1.logger.info("🎉 Successfully seeded 4 Nước Ép Vải products!");
        // Verify products
        const allProducts = await Product_1.Product.find({ slug: { $in: PRODUCTS.map(p => p.slug) } });
        logger_1.logger.info(`📊 Total products created/updated: ${allProducts.length}`);
        for (const product of allProducts) {
            logger_1.logger.info(`   - ${product.name} (${product.slug}): ${product.price.toLocaleString('vi-VN')} ${product.currency}`);
        }
    }
    catch (error) {
        logger_1.logger.error("❌ Error seeding products:", error);
        throw error;
    }
    finally {
        await mongoose_1.default.disconnect();
        logger_1.logger.info("🔌 Disconnected from MongoDB");
    }
}
// Run if called directly
if (require.main === module) {
    seedProducts()
        .then(() => {
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error(error);
        process.exit(1);
    });
}
