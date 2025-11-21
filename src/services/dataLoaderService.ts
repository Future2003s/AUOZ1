import DataLoader from "dataloader";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Brand } from "../models/Brand";
import { logger } from "../utils/logger";
import { advancedCacheService } from "./advancedCacheService";

/**
 * DataLoader Service for N+1 Query Optimization
 * Batches and caches database queries for optimal performance
 */
class DataLoaderService {
    private productLoader!: DataLoader<string, any>;
    private userLoader!: DataLoader<string, any>;
    private categoryLoader!: DataLoader<string, any>;
    private brandLoader!: DataLoader<string, any>;
    private productsByCategoryLoader!: DataLoader<string, any[]>;
    private productsByBrandLoader!: DataLoader<string, any[]>;

    constructor() {
        this.initializeLoaders();
    }

    private initializeLoaders(): void {
        // Product loader
        this.productLoader = new DataLoader(
            async (productIds: readonly string[]) => {
                const cacheKey = `products:batch:${productIds.join(",")}`;

                // Try cache first
                const cached = await advancedCacheService.get(cacheKey);
                if (cached) {
                    logger.debug(`DataLoader cache hit: products batch (${productIds.length} items)`);
                    return cached;
                }

                logger.debug(`DataLoader: Fetching ${productIds.length} products`);
                const products = await Product.find({
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
                await advancedCacheService.set(cacheKey, result, 300); // 5 minutes

                return result;
            },
            {
                maxBatchSize: 100,
                cacheKeyFn: (key) => key,
                cacheMap: new Map() // Enable per-request caching
            }
        );

        // User loader
        this.userLoader = new DataLoader(
            async (userIds: readonly string[]) => {
                const cacheKey = `users:batch:${userIds.join(",")}`;

                const cached = await advancedCacheService.get(cacheKey);
                if (cached) {
                    logger.debug(`DataLoader cache hit: users batch (${userIds.length} items)`);
                    return cached;
                }

                logger.debug(`DataLoader: Fetching ${userIds.length} users`);
                const users = await User.find({
                    _id: { $in: userIds },
                    isActive: true
                })
                    .lean()
                    .select("firstName lastName email avatar role createdAt")
                    .exec();

                const userMap = new Map(users.map((u) => [u._id.toString(), u]));
                const result = userIds.map((id) => userMap.get(id) || null);

                await advancedCacheService.set(cacheKey, result, 600); // 10 minutes

                return result;
            },
            {
                maxBatchSize: 50,
                cacheKeyFn: (key) => key,
                cacheMap: new Map()
            }
        );

        // Category loader
        this.categoryLoader = new DataLoader(
            async (categoryIds: readonly string[]) => {
                const cacheKey = `categories:batch:${categoryIds.join(",")}`;

                const cached = await advancedCacheService.get(cacheKey);
                if (cached) {
                    logger.debug(`DataLoader cache hit: categories batch (${categoryIds.length} items)`);
                    return cached;
                }

                logger.debug(`DataLoader: Fetching ${categoryIds.length} categories`);
                const categories = await Category.find({
                    _id: { $in: categoryIds },
                    isActive: true
                })
                    .lean()
                    .select("name slug description image parentCategory")
                    .exec();

                const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
                const result = categoryIds.map((id) => categoryMap.get(id) || null);

                await advancedCacheService.set(cacheKey, result, 1800); // 30 minutes

                return result;
            },
            {
                maxBatchSize: 50,
                cacheKeyFn: (key) => key,
                cacheMap: new Map()
            }
        );

        // Brand loader
        this.brandLoader = new DataLoader(
            async (brandIds: readonly string[]) => {
                const cacheKey = `brands:batch:${brandIds.join(",")}`;

                const cached = await advancedCacheService.get(cacheKey);
                if (cached) {
                    logger.debug(`DataLoader cache hit: brands batch (${brandIds.length} items)`);
                    return cached;
                }

                logger.debug(`DataLoader: Fetching ${brandIds.length} brands`);
                const brands = await Brand.find({
                    _id: { $in: brandIds },
                    isActive: true
                })
                    .lean()
                    .select("name slug description logo website")
                    .exec();

                const brandMap = new Map(brands.map((b) => [b._id.toString(), b]));
                const result = brandIds.map((id) => brandMap.get(id) || null);

                await advancedCacheService.set(cacheKey, result, 1800); // 30 minutes

                return result;
            },
            {
                maxBatchSize: 50,
                cacheKeyFn: (key) => key,
                cacheMap: new Map()
            }
        );

        // Products by category loader
        this.productsByCategoryLoader = new DataLoader(
            async (categoryIds: readonly string[]) => {
                logger.debug(`DataLoader: Fetching products for ${categoryIds.length} categories`);

                const results = await Promise.all(
                    categoryIds.map(async (categoryId) => {
                        const cacheKey = `products:category:${categoryId}`;

                        const cached = await advancedCacheService.get(cacheKey);
                        if (cached) {
                            return cached;
                        }

                        const products = await Product.find({
                            category: categoryId,
                            isVisible: true
                        })
                            .lean()
                            .select("name price images rating reviewCount")
                            .limit(20) // Limit to prevent huge results
                            .sort({ createdAt: -1 })
                            .exec();

                        await advancedCacheService.set(cacheKey, products, 600); // 10 minutes
                        return products;
                    })
                );

                return results;
            },
            {
                maxBatchSize: 20,
                cacheKeyFn: (key) => key,
                cacheMap: new Map()
            }
        );

        // Products by brand loader
        this.productsByBrandLoader = new DataLoader(
            async (brandIds: readonly string[]) => {
                logger.debug(`DataLoader: Fetching products for ${brandIds.length} brands`);

                const results = await Promise.all(
                    brandIds.map(async (brandId) => {
                        const cacheKey = `products:brand:${brandId}`;

                        const cached = await advancedCacheService.get(cacheKey);
                        if (cached) {
                            return cached;
                        }

                        const products = await Product.find({
                            brand: brandId,
                            isVisible: true
                        })
                            .lean()
                            .select("name price images rating reviewCount")
                            .limit(20)
                            .sort({ createdAt: -1 })
                            .exec();

                        await advancedCacheService.set(cacheKey, products, 600); // 10 minutes
                        return products;
                    })
                );

                return results;
            },
            {
                maxBatchSize: 20,
                cacheKeyFn: (key) => key,
                cacheMap: new Map()
            }
        );
    }

    /**
     * Load single product by ID
     */
    async loadProduct(productId: string) {
        return this.productLoader.load(productId);
    }

    /**
     * Load multiple products by IDs
     */
    async loadProducts(productIds: string[]) {
        return this.productLoader.loadMany(productIds);
    }

    /**
     * Load single user by ID
     */
    async loadUser(userId: string) {
        return this.userLoader.load(userId);
    }

    /**
     * Load multiple users by IDs
     */
    async loadUsers(userIds: string[]) {
        return this.userLoader.loadMany(userIds);
    }

    /**
     * Load single category by ID
     */
    async loadCategory(categoryId: string) {
        return this.categoryLoader.load(categoryId);
    }

    /**
     * Load multiple categories by IDs
     */
    async loadCategories(categoryIds: string[]) {
        return this.categoryLoader.loadMany(categoryIds);
    }

    /**
     * Load single brand by ID
     */
    async loadBrand(brandId: string) {
        return this.brandLoader.load(brandId);
    }

    /**
     * Load multiple brands by IDs
     */
    async loadBrands(brandIds: string[]) {
        return this.brandLoader.loadMany(brandIds);
    }

    /**
     * Load products by category ID
     */
    async loadProductsByCategory(categoryId: string) {
        return this.productsByCategoryLoader.load(categoryId);
    }

    /**
     * Load products by brand ID
     */
    async loadProductsByBrand(brandId: string) {
        return this.productsByBrandLoader.load(brandId);
    }

    /**
     * Clear all DataLoader caches
     */
    clearAll(): void {
        this.productLoader.clearAll();
        this.userLoader.clearAll();
        this.categoryLoader.clearAll();
        this.brandLoader.clearAll();
        this.productsByCategoryLoader.clearAll();
        this.productsByBrandLoader.clearAll();

        logger.debug("All DataLoader caches cleared");
    }

    /**
     * Clear specific cache
     */
    clear(type: "product" | "user" | "category" | "brand", id: string): void {
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

        logger.debug(`DataLoader cache cleared: ${type}:${id}`);
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

export const dataLoaderService = new DataLoaderService();
