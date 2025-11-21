"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataLoaderService = void 0;
const dataloader_1 = __importDefault(require("dataloader"));
const Product_1 = require("../models/Product");
const User_1 = require("../models/User");
const Category_1 = require("../models/Category");
const Brand_1 = require("../models/Brand");
const logger_1 = require("../utils/logger");
const advancedCacheService_1 = require("./advancedCacheService");
/**
 * DataLoader Service for N+1 Query Optimization
 * Batches and caches database queries for optimal performance
 */
class DataLoaderService {
    productLoader;
    userLoader;
    categoryLoader;
    brandLoader;
    productsByCategoryLoader;
    productsByBrandLoader;
    constructor() {
        this.initializeLoaders();
    }
    initializeLoaders() {
        // Product loader
        this.productLoader = new dataloader_1.default(async (productIds) => {
            const cacheKey = `products:batch:${productIds.join(",")}`;
            // Try cache first
            const cached = await advancedCacheService_1.advancedCacheService.get(cacheKey);
            if (cached) {
                logger_1.logger.debug(`DataLoader cache hit: products batch (${productIds.length} items)`);
                return cached;
            }
            logger_1.logger.debug(`DataLoader: Fetching ${productIds.length} products`);
            const products = await Product_1.Product.find({
                _id: { $in: productIds },
                isVisible: true
            })
                .lean()
                .select("name price images category brand rating reviewCount stock")
                .exec();
            // Create a map for O(1) lookup
            const productMap = new Map(products.map((p) => [p._id.toString(), p]));
            // Return results in the same order as requested IDs
            const result = productIds.map((id) => productMap.get(id) || null);
            // Cache the result
            await advancedCacheService_1.advancedCacheService.set(cacheKey, result, 300); // 5 minutes
            return result;
        }, {
            maxBatchSize: 100,
            cacheKeyFn: (key) => key,
            cacheMap: new Map() // Enable per-request caching
        });
        // User loader
        this.userLoader = new dataloader_1.default(async (userIds) => {
            const cacheKey = `users:batch:${userIds.join(",")}`;
            const cached = await advancedCacheService_1.advancedCacheService.get(cacheKey);
            if (cached) {
                logger_1.logger.debug(`DataLoader cache hit: users batch (${userIds.length} items)`);
                return cached;
            }
            logger_1.logger.debug(`DataLoader: Fetching ${userIds.length} users`);
            const users = await User_1.User.find({
                _id: { $in: userIds },
                isActive: true
            })
                .lean()
                .select("firstName lastName email avatar role createdAt")
                .exec();
            const userMap = new Map(users.map((u) => [u._id.toString(), u]));
            const result = userIds.map((id) => userMap.get(id) || null);
            await advancedCacheService_1.advancedCacheService.set(cacheKey, result, 600); // 10 minutes
            return result;
        }, {
            maxBatchSize: 50,
            cacheKeyFn: (key) => key,
            cacheMap: new Map()
        });
        // Category loader
        this.categoryLoader = new dataloader_1.default(async (categoryIds) => {
            const cacheKey = `categories:batch:${categoryIds.join(",")}`;
            const cached = await advancedCacheService_1.advancedCacheService.get(cacheKey);
            if (cached) {
                logger_1.logger.debug(`DataLoader cache hit: categories batch (${categoryIds.length} items)`);
                return cached;
            }
            logger_1.logger.debug(`DataLoader: Fetching ${categoryIds.length} categories`);
            const categories = await Category_1.Category.find({
                _id: { $in: categoryIds },
                isActive: true
            })
                .lean()
                .select("name slug description image parentCategory")
                .exec();
            const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
            const result = categoryIds.map((id) => categoryMap.get(id) || null);
            await advancedCacheService_1.advancedCacheService.set(cacheKey, result, 1800); // 30 minutes
            return result;
        }, {
            maxBatchSize: 50,
            cacheKeyFn: (key) => key,
            cacheMap: new Map()
        });
        // Brand loader
        this.brandLoader = new dataloader_1.default(async (brandIds) => {
            const cacheKey = `brands:batch:${brandIds.join(",")}`;
            const cached = await advancedCacheService_1.advancedCacheService.get(cacheKey);
            if (cached) {
                logger_1.logger.debug(`DataLoader cache hit: brands batch (${brandIds.length} items)`);
                return cached;
            }
            logger_1.logger.debug(`DataLoader: Fetching ${brandIds.length} brands`);
            const brands = await Brand_1.Brand.find({
                _id: { $in: brandIds },
                isActive: true
            })
                .lean()
                .select("name slug description logo website")
                .exec();
            const brandMap = new Map(brands.map((b) => [b._id.toString(), b]));
            const result = brandIds.map((id) => brandMap.get(id) || null);
            await advancedCacheService_1.advancedCacheService.set(cacheKey, result, 1800); // 30 minutes
            return result;
        }, {
            maxBatchSize: 50,
            cacheKeyFn: (key) => key,
            cacheMap: new Map()
        });
        // Products by category loader
        this.productsByCategoryLoader = new dataloader_1.default(async (categoryIds) => {
            logger_1.logger.debug(`DataLoader: Fetching products for ${categoryIds.length} categories`);
            const results = await Promise.all(categoryIds.map(async (categoryId) => {
                const cacheKey = `products:category:${categoryId}`;
                const cached = await advancedCacheService_1.advancedCacheService.get(cacheKey);
                if (cached) {
                    return cached;
                }
                const products = await Product_1.Product.find({
                    category: categoryId,
                    isVisible: true
                })
                    .lean()
                    .select("name price images rating reviewCount")
                    .limit(20) // Limit to prevent huge results
                    .sort({ createdAt: -1 })
                    .exec();
                await advancedCacheService_1.advancedCacheService.set(cacheKey, products, 600); // 10 minutes
                return products;
            }));
            return results;
        }, {
            maxBatchSize: 20,
            cacheKeyFn: (key) => key,
            cacheMap: new Map()
        });
        // Products by brand loader
        this.productsByBrandLoader = new dataloader_1.default(async (brandIds) => {
            logger_1.logger.debug(`DataLoader: Fetching products for ${brandIds.length} brands`);
            const results = await Promise.all(brandIds.map(async (brandId) => {
                const cacheKey = `products:brand:${brandId}`;
                const cached = await advancedCacheService_1.advancedCacheService.get(cacheKey);
                if (cached) {
                    return cached;
                }
                const products = await Product_1.Product.find({
                    brand: brandId,
                    isVisible: true
                })
                    .lean()
                    .select("name price images rating reviewCount")
                    .limit(20)
                    .sort({ createdAt: -1 })
                    .exec();
                await advancedCacheService_1.advancedCacheService.set(cacheKey, products, 600); // 10 minutes
                return products;
            }));
            return results;
        }, {
            maxBatchSize: 20,
            cacheKeyFn: (key) => key,
            cacheMap: new Map()
        });
    }
    /**
     * Load single product by ID
     */
    async loadProduct(productId) {
        return this.productLoader.load(productId);
    }
    /**
     * Load multiple products by IDs
     */
    async loadProducts(productIds) {
        return this.productLoader.loadMany(productIds);
    }
    /**
     * Load single user by ID
     */
    async loadUser(userId) {
        return this.userLoader.load(userId);
    }
    /**
     * Load multiple users by IDs
     */
    async loadUsers(userIds) {
        return this.userLoader.loadMany(userIds);
    }
    /**
     * Load single category by ID
     */
    async loadCategory(categoryId) {
        return this.categoryLoader.load(categoryId);
    }
    /**
     * Load multiple categories by IDs
     */
    async loadCategories(categoryIds) {
        return this.categoryLoader.loadMany(categoryIds);
    }
    /**
     * Load single brand by ID
     */
    async loadBrand(brandId) {
        return this.brandLoader.load(brandId);
    }
    /**
     * Load multiple brands by IDs
     */
    async loadBrands(brandIds) {
        return this.brandLoader.loadMany(brandIds);
    }
    /**
     * Load products by category ID
     */
    async loadProductsByCategory(categoryId) {
        return this.productsByCategoryLoader.load(categoryId);
    }
    /**
     * Load products by brand ID
     */
    async loadProductsByBrand(brandId) {
        return this.productsByBrandLoader.load(brandId);
    }
    /**
     * Clear all DataLoader caches
     */
    clearAll() {
        this.productLoader.clearAll();
        this.userLoader.clearAll();
        this.categoryLoader.clearAll();
        this.brandLoader.clearAll();
        this.productsByCategoryLoader.clearAll();
        this.productsByBrandLoader.clearAll();
        logger_1.logger.debug("All DataLoader caches cleared");
    }
    /**
     * Clear specific cache
     */
    clear(type, id) {
        switch (type) {
            case "product":
                this.productLoader.clear(id);
                break;
            case "user":
                this.userLoader.clear(id);
                break;
            case "category":
                this.categoryLoader.clear(id);
                this.productsByCategoryLoader.clear(id);
                break;
            case "brand":
                this.brandLoader.clear(id);
                this.productsByBrandLoader.clear(id);
                break;
        }
        logger_1.logger.debug(`DataLoader cache cleared: ${type}:${id}`);
    }
    /**
     * Get DataLoader statistics
     */
    getStats() {
        return {
            products: {
                cacheSize: 0, // cacheMap not available in this version
                maxBatchSize: 100
            },
            users: {
                cacheSize: 0, // cacheMap not available in this version
                maxBatchSize: 50
            },
            categories: {
                cacheSize: 0, // cacheMap not available in this version
                maxBatchSize: 50
            },
            brands: {
                cacheSize: 0, // cacheMap not available in this version
                maxBatchSize: 50
            },
            productsByCategory: {
                cacheSize: 0, // cacheMap not available in this version
                maxBatchSize: 20
            },
            productsByBrand: {
                cacheSize: 0, // cacheMap not available in this version
                maxBatchSize: 20
            }
        };
    }
}
exports.dataLoaderService = new DataLoaderService();
