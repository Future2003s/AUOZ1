import mongoose from "mongoose";
import { logger } from "../utils/logger";

/**
 * Optimized database indexes for maximum performance
 * This file contains all index definitions for better query performance
 */

export const createOptimizedIndexes = async (): Promise<void> => {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Database connection not established");
        }

        logger.info("🔍 Creating optimized database indexes...");

        // User Collection Indexes
        await createUserIndexes(db);

        // Product Collection Indexes
        await createProductIndexes(db);

        // Category Collection Indexes
        await createCategoryIndexes(db);

        // Brand Collection Indexes
        await createBrandIndexes(db);

        // Cart Collection Indexes
        await createCartIndexes(db);

        // Order Collection Indexes
        await createOrderIndexes(db);

        // Review Collection Indexes
        await createReviewIndexes(db);

        logger.info("✅ All database indexes created successfully");

        // Log index statistics
        await logIndexStatistics(db);
    } catch (error) {
        logger.error("❌ Error creating database indexes:", error);
        throw error;
    }
};

const createUserIndexes = async (db: any) => {
    const collection = db.collection("users");

    // Primary indexes for authentication and user lookup
    await collection.createIndex({ email: 1 }, { unique: true, background: true });
    await collection.createIndex({ phone: 1 }, { sparse: true, background: true });

    // Performance indexes
    await collection.createIndex({ isActive: 1, role: 1 }, { background: true });
    await collection.createIndex({ createdAt: -1 }, { background: true });
    await collection.createIndex({ lastLogin: -1 }, { background: true });
    await collection.createIndex({ isEmailVerified: 1 }, { background: true });

    // Compound indexes for common queries
    await collection.createIndex({ role: 1, isActive: 1, createdAt: -1 }, { background: true });

    logger.info("📝 User indexes created");
};

const createProductIndexes = async (db: any) => {
    const collection = db.collection("products");

    // Primary indexes
    await collection.createIndex({ sku: 1 }, { unique: true, background: true });
    await collection.createIndex({ slug: 1 }, { unique: true, sparse: true, background: true });

    // Category and brand indexes
    await collection.createIndex({ category: 1 }, { background: true });
    await collection.createIndex({ brand: 1 }, { background: true });

    // Status and visibility indexes
    await collection.createIndex({ status: 1, isVisible: 1 }, { background: true });
    await collection.createIndex({ isFeatured: 1, status: 1 }, { background: true });

    // Price and sale indexes
    await collection.createIndex({ price: 1 }, { background: true });
    await collection.createIndex({ onSale: 1, salePrice: 1 }, { background: true });

    // Rating and review indexes
    await collection.createIndex({ averageRating: -1 }, { background: true });
    await collection.createIndex({ reviewCount: -1 }, { background: true });

    // Inventory indexes
    await collection.createIndex({ quantity: 1, trackQuantity: 1 }, { background: true });

    // Text search index for product search (handle existing index)
    try {
        // Check if old text index exists and drop it
        const existingIndexes = await collection.listIndexes().toArray();
        const textIndexes = existingIndexes.filter((index: any) => index.key && index.key._fts === "text");

        for (const textIndex of textIndexes) {
            if (textIndex.name !== "product_text_search") {
                logger.info(`🗑️ Dropping old text index: ${textIndex.name}`);
                await collection.dropIndex(textIndex.name);
            }
        }

        // Create new optimized text index
        await collection.createIndex(
            {
                name: "text",
                description: "text",
                tags: "text"
            },
            {
                background: true,
                weights: {
                    name: 10,
                    tags: 5,
                    description: 1
                },
                name: "product_text_search"
            }
        );
    } catch (error: any) {
        if (error.code === 85 || error.code === 86) {
            // IndexOptionsConflict or IndexKeySpecsConflict
            logger.warn("⚠️ Text index already exists with different options, skipping...");
        } else {
            logger.error("❌ Error creating text index:", error.message);
        }
    }

    // Compound indexes for common filter combinations
    await collection.createIndex({ category: 1, status: 1, isVisible: 1 }, { background: true });
    await collection.createIndex({ brand: 1, status: 1, isVisible: 1 }, { background: true });
    await collection.createIndex({ category: 1, price: 1 }, { background: true });
    await collection.createIndex({ status: 1, isVisible: 1, isFeatured: 1, createdAt: -1 }, { background: true });
    await collection.createIndex({ onSale: 1, status: 1, isVisible: 1 }, { background: true });

    // Performance indexes for sorting
    await collection.createIndex({ createdAt: -1 }, { background: true });
    await collection.createIndex({ updatedAt: -1 }, { background: true });

    logger.info("📦 Product indexes created");
};

const createCategoryIndexes = async (db: any) => {
    const collection = db.collection("categories");

    // Primary indexes
    await collection.createIndex({ slug: 1 }, { unique: true, background: true });
    await collection.createIndex({ name: 1 }, { background: true });

    // Hierarchy indexes
    await collection.createIndex({ parent: 1 }, { background: true });
    await collection.createIndex({ isActive: 1 }, { background: true });
    await collection.createIndex({ sortOrder: 1 }, { background: true });

    // Compound indexes
    await collection.createIndex({ parent: 1, isActive: 1, sortOrder: 1 }, { background: true });
    await collection.createIndex({ isActive: 1, sortOrder: 1, name: 1 }, { background: true });

    // Text search
    await collection.createIndex({ name: "text", description: "text" }, { background: true });

    logger.info("📂 Category indexes created");
};

const createBrandIndexes = async (db: any) => {
    const collection = db.collection("brands");

    // Primary indexes
    await collection.createIndex({ slug: 1 }, { unique: true, background: true });
    await collection.createIndex({ name: 1 }, { unique: true, background: true });

    // Performance indexes
    await collection.createIndex({ isActive: 1 }, { background: true });
    await collection.createIndex({ productCount: -1 }, { background: true });

    // Compound indexes
    await collection.createIndex({ isActive: 1, productCount: -1 }, { background: true });

    // Text search
    await collection.createIndex({ name: "text", description: "text" }, { background: true });

    logger.info("🏷️ Brand indexes created");
};

const createCartIndexes = async (db: any) => {
    const collection = db.collection("carts");

    // Primary indexes
    await collection.createIndex({ user: 1 }, { unique: true, sparse: true, background: true });
    await collection.createIndex({ sessionId: 1 }, { unique: true, sparse: true, background: true });

    // Performance indexes
    await collection.createIndex({ isActive: 1 }, { background: true });
    await collection.createIndex({ updatedAt: -1 }, { background: true });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });

    // Compound indexes
    await collection.createIndex({ isActive: 1, updatedAt: -1 }, { background: true });

    logger.info("🛒 Cart indexes created");
};

const createOrderIndexes = async (db: any) => {
    const collection = db.collection("orders");

    // Primary indexes
    await collection.createIndex({ orderNumber: 1 }, { unique: true, background: true });
    await collection.createIndex({ user: 1 }, { background: true });

    // Status indexes
    await collection.createIndex({ status: 1 }, { background: true });
    await collection.createIndex({ "payment.status": 1 }, { background: true });

    // Date indexes
    await collection.createIndex({ createdAt: -1 }, { background: true });
    await collection.createIndex({ deliveredAt: -1 }, { sparse: true, background: true });

    // Compound indexes for common queries
    await collection.createIndex({ user: 1, status: 1, createdAt: -1 }, { background: true });
    await collection.createIndex({ status: 1, createdAt: -1 }, { background: true });
    await collection.createIndex({ "payment.status": 1, createdAt: -1 }, { background: true });

    // Tracking indexes
    await collection.createIndex({ trackingNumber: 1 }, { sparse: true, background: true });

    logger.info("📋 Order indexes created");
};

const createReviewIndexes = async (db: any) => {
    const collection = db.collection("reviews");

    // Primary indexes
    await collection.createIndex({ product: 1, user: 1 }, { unique: true, background: true });
    await collection.createIndex({ product: 1 }, { background: true });
    await collection.createIndex({ user: 1 }, { background: true });

    // Performance indexes
    await collection.createIndex({ rating: 1 }, { background: true });
    await collection.createIndex({ status: 1 }, { background: true });
    await collection.createIndex({ isVerifiedPurchase: 1 }, { background: true });
    await collection.createIndex({ createdAt: -1 }, { background: true });

    // Helpfulness indexes
    await collection.createIndex({ helpfulCount: -1 }, { background: true });

    // Compound indexes for common queries
    await collection.createIndex({ product: 1, status: 1, createdAt: -1 }, { background: true });
    await collection.createIndex({ product: 1, rating: 1 }, { background: true });
    await collection.createIndex({ status: 1, createdAt: -1 }, { background: true });
    await collection.createIndex({ user: 1, createdAt: -1 }, { background: true });

    // Text search for review content
    await collection.createIndex({ title: "text", comment: "text" }, { background: true });

    logger.info("⭐ Review indexes created");
};

const logIndexStatistics = async (db: any) => {
    try {
        const collections = ["users", "products", "categories", "brands", "carts", "orders", "reviews"];

        for (const collectionName of collections) {
            const collection = db.collection(collectionName);
            const indexes = await collection.listIndexes().toArray();
            logger.info(`📊 ${collectionName}: ${indexes.length} indexes created`);
        }
    } catch (error) {
        logger.warn("Could not log index statistics:", error);
    }
};

export const dropAllIndexes = async (): Promise<void> => {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Database connection not established");
        }

        const collections = ["users", "products", "categories", "brands", "carts", "orders", "reviews"];

        for (const collectionName of collections) {
            try {
                const collection = db.collection(collectionName);
                await collection.dropIndexes();
                logger.info(`🗑️ Dropped indexes for ${collectionName}`);
            } catch (error) {
                logger.warn(`Could not drop indexes for ${collectionName}:`, error);
            }
        }

        logger.info("✅ All indexes dropped successfully");
    } catch (error) {
        logger.error("❌ Error dropping indexes:", error);
        throw error;
    }
};
