import { Types } from "mongoose";
import { Product, IProduct } from "../models/Product";
import { Category } from "../models/Category";
import { Brand } from "../models/Brand";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { CacheWrapper, QueryAnalyzer } from "../utils/performance";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/redis";
import { paginateQuery, optimizedPagination } from "../utils/pagination";

interface CreateProductData {
    name: string;
    description?: string;
    shortDescription?: string;
    price: number;
    comparePrice?: number;
    costPrice?: number;
    sku: string;
    barcode?: string;
    trackQuantity?: boolean;
    quantity?: number;
    allowBackorder?: boolean;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
        unit: "cm" | "in";
    };
    category: string;
    brand?: string;
    tags?: string[];
    images?: Array<{
        url: string;
        alt?: string;
        isMain: boolean;
        order: number;
    }>;
    hasVariants?: boolean;
    variants?: Array<{
        name: string;
        options: string[];
    }>;
    seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
    };
    status?: "draft" | "active" | "archived";
    isVisible?: boolean;
    isFeatured?: boolean;
    onSale?: boolean;
    salePrice?: number;
    saleStartDate?: Date;
    saleEndDate?: Date;
    requiresShipping?: boolean;
    shippingClass?: string;
}

interface UpdateProductData extends Partial<CreateProductData> {}

interface ProductFilters {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    status?: string;
    isVisible?: boolean;
    isFeatured?: boolean;
    onSale?: boolean;
    inStock?: boolean;
    search?: string;
}

interface ProductQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
}

export class ProductService {
    private static cache = new CacheWrapper(CACHE_PREFIXES.PRODUCTS, CACHE_TTL.MEDIUM);
    private static categoryCache = new CacheWrapper(CACHE_PREFIXES.CATEGORIES, CACHE_TTL.LONG);
    private static brandCache = new CacheWrapper(CACHE_PREFIXES.BRANDS, CACHE_TTL.LONG);

    /**
     * Create a new product
     */
    static async createProduct(productData: CreateProductData, userId: string): Promise<IProduct> {
        try {
            // Validate category exists
            const category = await Category.findById(productData.category);
            if (!category) {
                throw new AppError("Category not found", 404);
            }

            // Validate brand if provided
            if (productData.brand) {
                const brand = await Brand.findById(productData.brand);
                if (!brand) {
                    throw new AppError("Brand not found", 404);
                }
            }

            // Check if SKU already exists
            const existingProduct = await Product.findOne({ sku: productData.sku });
            if (existingProduct) {
                throw new AppError("Product with this SKU already exists", 400);
            }

            // Create product
            const product = await Product.create({
                ...productData,
                createdBy: userId
            });

            // Update category product count
            await Category.findByIdAndUpdate(productData.category, { $inc: { productCount: 1 } });

            // Update brand product count if brand is provided
            if (productData.brand) {
                await Brand.findByIdAndUpdate(productData.brand, { $inc: { productCount: 1 } });
            }

            await product.populate(["category", "brand", "createdBy"]);

            // Newly created products must invalidate cached listings so they appear immediately
            await this.invalidateProductCache();
            await optimizedPagination.clearCache();
            if (productData.isFeatured) {
                await this.invalidateProductCache("featured:*");
            }

            logger.info(`Product created: ${product.name} by user: ${userId}`);
            return product;
        } catch (error) {
            logger.error("Create product error:", error);
            throw error;
        }
    }

    /**
     * Get products with filters and pagination
     */
    static async getProducts(
        filters: ProductFilters = {},
        query: ProductQuery = {}
    ): Promise<{
        products: IProduct[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        try {
            const { page = 1, limit = 20, sort = "createdAt", order = "desc" } = query;

            // Generate cache key based on filters and query
            const cacheKey = this.generateCacheKey("products", filters, query);

            // Try to get from cache first
            const cached = await this.cache.get<any>(cacheKey);
            if (cached) {
                logger.debug(`Cache hit for products: ${cacheKey}`);
                return cached;
            }

            // Build optimized filter query
            const filterQuery = this.buildProductFilterQuery(filters);
            
            // Exclude honey products (mật ong) by default unless explicitly requested
            // This ensures only nước ép vải products are shown
            const searchTerm = filters.search?.toLowerCase() || "";
            const isHoneySearch = searchTerm.includes("mật ong") || searchTerm.includes("mat ong") || searchTerm.includes("honey");
            
            if (!isHoneySearch) {
                // Add exclusion for honey products
                filterQuery.$and = filterQuery.$and || [];
                filterQuery.$and.push({
                    name: { $not: { $regex: /mật ong|mat ong|honey/i } }
                });
            }

            // If searching, also search in category and brand names using aggregation
            if (filters.search && filters.search.trim()) {
                const searchTerm = filters.search.trim();
                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const searchRegex = new RegExp(escapedTerm, 'i');
                
                // First, get products that match the main search
                const mainQuery = Product.find(filterQuery).lean();
                const mainResults = await mainQuery.exec();
                
                // Then search in category and brand collections
                const categoryMatches = await Category.find({ name: searchRegex }).select('_id').lean();
                const brandMatches = await Brand.find({ name: searchRegex }).select('_id').lean();
                
                const categoryIds = categoryMatches.map(c => c._id);
                const brandIds = brandMatches.map(b => b._id);
                
                // Get products by category or brand
                const additionalQuery: any = {
                    ...filterQuery,
                    $or: [
                        ...(filterQuery.$or || []),
                        ...(categoryIds.length > 0 ? [{ category: { $in: categoryIds } }] : []),
                        ...(brandIds.length > 0 ? [{ brand: { $in: brandIds } }] : [])
                    ]
                };
                
                // If we have additional matches, update the query
                if (categoryIds.length > 0 || brandIds.length > 0) {
                    const additionalResults = await Product.find(additionalQuery).lean().exec();
                    const allProductIds = new Set([
                        ...mainResults.map((p: any) => p._id.toString()),
                        ...additionalResults.map((p: any) => p._id.toString())
                    ]);
                    
                    if (allProductIds.size > 0) {
                        filterQuery._id = { $in: Array.from(allProductIds).map(id => new Types.ObjectId(id)) };
                    }
                }
            }

            // Create base query with necessary relations populated for admin UI
            const baseQuery = Product.find(filterQuery).populate("category", "name").populate("brand", "name");

            // Use optimized pagination
            const result = await paginateQuery(baseQuery, {
                page,
                limit,
                sort,
                order,
                maxLimit: 100,
                cacheTTL: CACHE_TTL.SHORT,
                cacheKey
            });

            // Transform the result to match expected format
            const response = {
                products: result.data,
                pagination: {
                    page: result.pagination.page,
                    limit: result.pagination.limit,
                    total: result.pagination.total,
                    pages: result.pagination.pages
                }
            };

            // Cache the result
            await this.cache.set(cacheKey, response, CACHE_TTL.SHORT);

            return response;
        } catch (error) {
            logger.error("Get products error:", error);
            throw error;
        }
    }

    /**
     * Get product by ID (with caching)
     * Only accepts valid MongoDB ObjectId
     */
    static async getProductById(productId: string): Promise<IProduct> {
        try {
            // Strict validation: ObjectId must be exactly 24 hex characters
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            if (!objectIdPattern.test(productId)) {
                logger.warn(`getProductById called with non-ObjectId: ${productId}`);
                throw new AppError(`Invalid product ID format: "${productId}". Expected 24-character hexadecimal ObjectId. Use getProductBySlug() for slug lookup.`, 400);
            }

            // Try cache first
            const cacheKey = `product:${productId}`;
            const cached = await this.cache.get<IProduct>(cacheKey);
            if (cached) {
                return cached;
            }

            // Use findById only after validation - this will throw if productId is invalid
            const product = await Product.findById(productId)
                .populate("category", "name slug description")
                .populate("brand", "name slug logo website")
                .populate("createdBy", "firstName lastName")
                .lean();

            if (!product) {
                throw new AppError("Product not found", 404);
            }

            // Cache the result
            await this.cache.set(cacheKey, product, CACHE_TTL.MEDIUM);
            return product as IProduct;
        } catch (error) {
            logger.error("Get product by ID error:", error);
            throw error;
        }
    }

    /**
     * Get product by slug (with caching and alias support)
     * Supports backward compatibility with old slugs
     */
    static async getProductBySlug(slug: string): Promise<IProduct> {
        try {
            // Validate slug is not an ObjectId (to prevent confusion)
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            if (objectIdPattern.test(slug)) {
                logger.warn(`getProductBySlug called with ObjectId: ${slug}. Use getProductById() instead.`);
                // Still try to find by slug first, but also suggest using getProductById
            }

            const cacheKey = `product:slug:${slug}`;
            const cached = await this.cache.get<IProduct>(cacheKey);
            if (cached) {
                logger.debug(`Cache HIT for slug: ${slug}`);
                return cached;
            }
            
            logger.debug(`Cache MISS for slug: ${slug}, querying database...`);

            // Slug alias mapping for backward compatibility
            const SLUG_ALIASES: Record<string, string> = {
                "nuoc-cot-vai-100": "nuoc-ep-vai-thieu"
            };

            // Resolve alias if exists
            const resolvedSlug = SLUG_ALIASES[slug] || slug;

            // Try to find product with active status first
            let product = await Product.findOne({ slug: resolvedSlug, status: "active", isVisible: true })
                .populate("category", "name slug description")
                .populate("brand", "name slug logo website")
                .populate("createdBy", "firstName lastName")
                .lean();

            // If not found with active status, try without status filter (for draft products)
            if (!product) {
                product = await Product.findOne({ slug: resolvedSlug })
                    .populate("category", "name slug description")
                    .populate("brand", "name slug logo website")
                    .populate("createdBy", "firstName lastName")
                    .lean();
            }

            // If not found and original slug was an alias, try original slug
            if (!product && SLUG_ALIASES[slug]) {
                product = await Product.findOne({ slug, status: "active", isVisible: true })
                    .populate("category", "name slug description")
                    .populate("brand", "name slug logo website")
                    .populate("createdBy", "firstName lastName")
                    .lean();
                
                // If still not found, try without status filter
                if (!product) {
                    product = await Product.findOne({ slug })
                        .populate("category", "name slug description")
                        .populate("brand", "name slug logo website")
                        .populate("createdBy", "firstName lastName")
                        .lean();
                }
            }

            if (!product) {
                throw new AppError(`Product with slug "${slug}" not found`, 404);
            }

            await this.cache.set(cacheKey, product, CACHE_TTL.MEDIUM);
            return product as IProduct;
        } catch (error) {
            logger.error("Get product by slug error:", error);
            throw error;
        }
    }

    /**
     * Get "Nước Cốt Vải 100% Thanh Hà" product specifically for OrderFe
     * This is a dedicated endpoint for the specific product
     */
    static async getNuocCotVai100Product(): Promise<IProduct> {
        try {
            const cacheKey = "product:nuoc-cot-vai-100";
            const cached = await this.cache.get<IProduct>(cacheKey);
            if (cached) {
                return cached;
            }

            // Try multiple search patterns to find the product
            // Note: Product model doesn't have slug field, so we search by name and tags only
            const searchPatterns = [
                { name: { $regex: /nước cốt vải.*100.*thanh hà/i } },
                { name: { $regex: /nuoc cot vai.*100.*thanh ha/i } },
                { name: { $regex: /nước ép vải.*100.*thanh hà/i } },
                { name: { $regex: /nuoc ep vai.*100.*thanh ha/i } },
                { name: { $regex: /100.*nước.*vải.*thanh hà/i } },
                { name: { $regex: /100.*nuoc.*vai.*thanh ha/i } },
                { name: { $regex: /nước cốt vải.*thanh hà/i } },
                { name: { $regex: /nuoc cot vai.*thanh ha/i } },
                { name: { $regex: /nước ép vải.*thanh hà/i } },
                { tags: { $in: ["nuoc-cot-vai-100", "nước cốt vải 100", "thanh hà", "nuoc-cot-vai", "nước cốt vải"] } },
                // More flexible search - find any product with "vải" and "100" or "thanh hà"
                { 
                    $and: [
                        { name: { $regex: /vải|vai/i } },
                        { $or: [
                            { name: { $regex: /100/i } },
                            { name: { $regex: /thanh hà|thanh ha/i } }
                        ]}
                    ]
                }
            ];

            let product = null;
            for (const pattern of searchPatterns) {
                try {
                    product = await Product.findOne({
                        ...pattern,
                        status: "active",
                        isVisible: true
                    })
                        .populate("category", "name slug description")
                        .populate("brand", "name slug logo website")
                        .populate("createdBy", "firstName lastName")
                        .lean();

                    if (product) {
                        logger.info(`Found Nuoc Cot Vai 100 product with pattern: ${JSON.stringify(pattern)}`);
                        break;
                    }
                } catch (patternError) {
                    // Skip invalid patterns and continue
                    logger.warn(`Pattern search failed: ${JSON.stringify(pattern)}`, patternError);
                    continue;
                }
            }

            // If still not found, try a broader search for any product with "vải" in name
            if (!product) {
                logger.warn("Nuoc Cot Vai 100 product not found with specific patterns, trying broader search...");
                product = await Product.findOne({
                    name: { $regex: /vải|vai/i },
                    status: "active",
                    isVisible: true
                })
                    .populate("category", "name slug description")
                    .populate("brand", "name slug logo website")
                    .populate("createdBy", "firstName lastName")
                    .sort({ createdAt: -1 }) // Get the most recent one
                    .lean();
            }

            if (!product) {
                logger.error("No product found matching 'Nước Cốt Vải 100% Thanh Hà' or any similar product");
                throw new AppError("Nước Cốt Vải 100% Thanh Hà product not found. Please create this product in the database first.", 404);
            }

            // Cache the result for longer since this is a specific product
            await this.cache.set(cacheKey, product, CACHE_TTL.LONG);
            return product as IProduct;
        } catch (error) {
            logger.error("Get Nuoc Cot Vai 100 product error:", error);
            throw error;
        }
    }

    /**
     * Update product (with cache invalidation)
     */
    static async updateProduct(productId: string, updateData: UpdateProductData, userId: string): Promise<IProduct> {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new AppError("Product not found", 404);
            }

            // Sanitize immutable and server-controlled fields from incoming update
            const {
                createdBy: _ignoreCreatedBy,
                updatedBy: _ignoreUpdatedBy,
                _id: _ignoreId,
                id: _ignoreId2,
                ...sanitizedUpdate
            } = updateData as any;

            // Validate category if provided
            if (sanitizedUpdate.category && sanitizedUpdate.category !== product.category.toString()) {
                const categoryExists = await Category.findById(sanitizedUpdate.category);
                if (!categoryExists) {
                    throw new AppError("Category not found", 404);
                }
            }

            // Validate brand if provided
            if (sanitizedUpdate.brand && sanitizedUpdate.brand !== product.brand?.toString()) {
                const brandExists = await Brand.findById(sanitizedUpdate.brand);
                if (!brandExists) {
                    throw new AppError("Brand not found", 404);
                }
            }

            // Check if isFeatured is being updated
            const wasFeatured = product.isFeatured;
            const isFeaturedUpdated =
                sanitizedUpdate.hasOwnProperty("isFeatured") && sanitizedUpdate.isFeatured !== wasFeatured;

            // Update product
            Object.assign(product, sanitizedUpdate);
            // Ensure createdBy exists for legacy documents
            if (!product.createdBy) {
                product.createdBy = userId as any;
            }
            product.updatedBy = userId as any;
            await product.save();

            // Invalidate caches so subsequent fetches don't serve stale data
            await this.invalidateProductCache(`product:${productId}`); // direct product cache
            await this.cache.invalidatePattern("*"); // all product list caches

            // Invalidate featured products cache if isFeatured was updated or if product status/visibility changed
            if (
                isFeaturedUpdated ||
                sanitizedUpdate.hasOwnProperty("status") ||
                sanitizedUpdate.hasOwnProperty("isVisible")
            ) {
                // Invalidate all featured product caches (different limits)
                await this.invalidateProductCache("featured:*");
                logger.info(
                    `Featured products cache invalidated due to isFeatured/status/isVisible change for product ${productId}`
                );
            }

            await optimizedPagination.clearCache(); // clear pagination caches

            await product.populate(["category", "brand", "createdBy"]);
            return product;
        } catch (error) {
            logger.error("Update product error:", error);
            throw error;
        }
    }

    /**
     * Delete product (with cache invalidation)
     */
    static async deleteProduct(productId: string): Promise<void> {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new AppError("Product not found", 404);
            }

            await Product.findByIdAndDelete(productId);

            // Invalidate cache
            await this.cache.del(`product:${productId}`);

            // Invalidate all list caches
            await this.invalidateProductCache();

            logger.info(`Product deleted: ${product.name}`);
        } catch (error) {
            logger.error("Delete product error:", error);
            throw error;
        }
    }

    /**
     * Helper method to build optimized filter query
     */
    private static buildProductFilterQuery(filters: ProductFilters): any {
        const filterQuery: any = {};
        const orConditions: any[] = [];

        if (filters.category) {
            filterQuery.category = filters.category;
        }

        if (filters.brand) {
            filterQuery.brand = filters.brand;
        }

        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            filterQuery.price = {};
            if (filters.minPrice !== undefined) {
                filterQuery.price.$gte = filters.minPrice;
            }
            if (filters.maxPrice !== undefined) {
                filterQuery.price.$lte = filters.maxPrice;
            }
        }

        if (filters.tags && filters.tags.length > 0) {
            filterQuery.tags = { $in: filters.tags };
        }

        if (filters.status) {
            filterQuery.status = filters.status;
        }

        if (filters.isVisible !== undefined) {
            filterQuery.isVisible = filters.isVisible;
        }

        if (filters.isFeatured !== undefined) {
            filterQuery.isFeatured = filters.isFeatured;
        }

        if (filters.onSale !== undefined) {
            filterQuery.onSale = filters.onSale;
        }

        if (filters.inStock !== undefined) {
            if (filters.inStock) {
                orConditions.push(
                    { trackQuantity: false },
                    { quantity: { $gt: 0 } },
                    { allowBackorder: true }
                );
            } else {
                filterQuery.trackQuantity = true;
                filterQuery.quantity = { $lte: 0 };
                filterQuery.allowBackorder = false;
            }
        }

        if (filters.search) {
            const searchTerm = filters.search.trim();
            if (searchTerm) {
                // Escape special regex characters
                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Use regex for case-insensitive partial matching
                const searchRegex = new RegExp(escapedTerm, 'i');
                
                // Search in multiple fields: name, description, shortDescription, tags, SKU, barcode
                // Also search in SEO fields
                const searchConditions: Record<string, any>[] = [
                    { name: searchRegex },
                    { description: searchRegex },
                    { shortDescription: searchRegex },
                    { tags: { $regex: escapedTerm, $options: 'i' } }, // Search in tags array
                    { sku: searchRegex },
                    { barcode: searchRegex },
                ];

                // Add SEO fields if they exist
                searchConditions.push(
                    { 'seo.title': searchRegex },
                    { 'seo.description': searchRegex },
                    { 'seo.keywords': { $regex: escapedTerm, $options: 'i' } } // Search in keywords array
                );

                // If we already have $or conditions (from inStock), combine them with $and
                if (orConditions.length > 0) {
                    // Use $and to combine both conditions
                    filterQuery.$and = [
                        { $or: orConditions },
                        { $or: searchConditions }
                    ];
                } else {
                    filterQuery.$or = searchConditions;
                }
            } else if (orConditions.length > 0) {
                filterQuery.$or = orConditions;
            }
        } else if (orConditions.length > 0) {
            filterQuery.$or = orConditions;
        }

        return filterQuery;
    }

    /**
     * Generate cache key for products
     */
    private static generateCacheKey(prefix: string, filters: any, query: any): string {
        const keyParts = [prefix, JSON.stringify(filters), JSON.stringify(query)];

        const keyString = keyParts.join("|");
        return Buffer.from(keyString).toString("base64").slice(0, 50);
    }

    /**
     * Invalidate product cache
     */
    static async invalidateProductCache(pattern?: string): Promise<void> {
        try {
            if (pattern) {
                await this.cache.invalidatePattern(pattern);
            } else {
                await this.cache.invalidatePattern("*");
            }
            logger.info(`Product cache invalidated${pattern ? ` with pattern: ${pattern}` : ""}`);
        } catch (error) {
            logger.error("Error invalidating product cache:", error);
        }
    }

    /**
     * Get featured products (with caching)
     */
    static async getFeaturedProducts(limit: number = 10): Promise<IProduct[]> {
        try {
            const cacheKey = `featured:${limit}`;
            const cached = await this.cache.get<IProduct[]>(cacheKey);
            if (cached) {
                logger.info(`Featured products cache HIT: Found ${cached.length} products`);
                return cached;
            }

            logger.info("Featured products cache MISS: Fetching from database");

            // Exclude honey products (mật ong) from featured products
            const excludeHoneyQuery = {
                name: { $not: { $regex: /mật ong|mat ong|honey/i } },
                description: { $not: { $regex: /mật ong|mat ong|honey/i } },
                tags: { $not: { $in: [/mật ong|mat ong|honey/i] } }
            };

            // Debug: Check counts
            const totalFeatured = await Product.countDocuments({ isFeatured: true });
            const activeFeatured = await Product.countDocuments({ isFeatured: true, status: "active" });
            const visibleActiveFeatured = await Product.countDocuments({
                isFeatured: true,
                status: "active",
                isVisible: true,
                ...excludeHoneyQuery
            });

            logger.info(
                `Featured products debug: total with isFeatured=true: ${totalFeatured}, active: ${activeFeatured}, visible+active: ${visibleActiveFeatured}`
            );

            // Exclude honey products from featured products
            const products = await Product.find({
                isFeatured: true,
                status: "active",
                isVisible: true,
                name: { $not: { $regex: /mật ong|mat ong|honey/i } }
            })
                .populate("category", "name slug")
                .populate("brand", "name slug logo")
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            logger.info(`Found ${products.length} featured products from database`);

            if (products.length === 0) {
                logger.warn(
                    "⚠️ No featured products found. Check if products have isFeatured=true, status='active', and isVisible=true"
                );
            }
            await this.cache.set(cacheKey, products, CACHE_TTL.MEDIUM);
            return products as IProduct[];
        } catch (error) {
            logger.error("Get featured products error:", error);
            throw error;
        }
    }

    /**
     * Search products (with caching)
     */
    static async searchProducts(
        searchTerm: string,
        filters: ProductFilters = {},
        query: ProductQuery = {}
    ): Promise<{
        products: IProduct[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        return this.getProducts({ ...filters, search: searchTerm }, query);
    }

    /**
     * Update product stock (with cache invalidation)
     */
    static async updateStock(productId: string, quantity: number): Promise<IProduct> {
        try {
            const product = await Product.findByIdAndUpdate(
                productId,
                { quantity },
                { new: true, runValidators: true }
            );

            if (!product) {
                throw new AppError("Product not found", 404);
            }

            // Invalidate cache
            await this.invalidateProductCache(productId);

            return product;
        } catch (error) {
            logger.error("Update stock error:", error);
            throw error;
        }
    }
}
