"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cursorPagination = exports.optimizedPagination = exports.CursorPagination = exports.OptimizedPagination = void 0;
exports.paginateQuery = paginateQuery;
const logger_1 = require("./logger");
const performance_1 = require("./performance");
/**
 * Optimized pagination class with intelligent caching
 */
class OptimizedPagination {
    cache;
    defaultOptions;
    constructor(cachePrefix = "pagination") {
        this.cache = new performance_1.CacheWrapper(cachePrefix, 300); // 5 minutes default TTL
        this.defaultOptions = {
            page: 1,
            limit: 20,
            sort: "createdAt",
            order: "desc",
            maxLimit: 100,
            defaultLimit: 20,
            cacheTTL: 300
        };
    }
    /**
     * Execute paginated query with caching and optimization
     */
    async paginate(query, options = {}) {
        const startTime = Date.now();
        // Merge options with defaults
        const opts = { ...this.defaultOptions, ...options };
        // Validate and sanitize pagination parameters
        const page = Math.max(1, opts.page);
        const limit = Math.min(Math.max(1, opts.limit), opts.maxLimit);
        // Build cache key if caching is enabled
        const cacheKey = opts.cacheKey || this.buildCacheKey(query, opts);
        // Try to get from cache first
        if (opts.cacheTTL > 0 && cacheKey) {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                cached.meta = {
                    ...cached.meta,
                    cached: true,
                    queryTime: Date.now() - startTime
                };
                return cached;
            }
        }
        // Build sort object
        const sortObj = this.buildSortObject(opts.sort, opts.order);
        // Calculate skip value
        const skip = (page - 1) * limit;
        // Execute optimized queries in parallel
        const [data, total] = await Promise.all([
            this.executeDataQuery(query, sortObj, skip, limit),
            this.executeCountQuery(query)
        ]);
        // Calculate pagination metadata
        const pages = Math.ceil(total / limit);
        const hasNext = page < pages;
        const hasPrev = page > 1;
        const result = {
            data,
            pagination: {
                page,
                limit,
                total,
                pages,
                hasNext,
                hasPrev,
                nextPage: hasNext ? page + 1 : undefined,
                prevPage: hasPrev ? page - 1 : undefined
            },
            meta: {
                cached: false,
                queryTime: Date.now() - startTime,
                cacheKey: opts.cacheTTL > 0 ? cacheKey : undefined
            }
        };
        // Cache the result if caching is enabled
        if (opts.cacheTTL > 0 && cacheKey) {
            await this.cache.set(cacheKey, result, opts.cacheTTL);
        }
        // Log slow queries
        if (result.meta && result.meta.queryTime > 100) {
            logger_1.logger.warn(`🐌 Slow pagination query: ${result.meta.queryTime}ms, total: ${total}, page: ${page}`);
        }
        return result;
    }
    /**
     * Execute optimized data query
     */
    async executeDataQuery(query, sortObj, skip, limit) {
        return query
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean({ virtuals: true }) // Use lean for better performance
            .exec();
    }
    /**
     * Execute optimized count query
     */
    async executeCountQuery(query) {
        // Clone the query to avoid modifying the original
        const countQuery = query.clone();
        // Use countDocuments for better performance
        return countQuery.countDocuments().exec();
    }
    /**
     * Build sort object from string parameters
     */
    buildSortObject(sort, order) {
        const sortObj = {};
        // Handle multiple sort fields
        const sortFields = sort.split(",");
        for (const field of sortFields) {
            const trimmedField = field.trim();
            if (trimmedField) {
                sortObj[trimmedField] = order === "asc" ? 1 : -1;
            }
        }
        // Always add _id as secondary sort for consistent pagination
        if (!sortObj._id) {
            sortObj._id = order === "asc" ? 1 : -1;
        }
        return sortObj;
    }
    /**
     * Build cache key for the query
     */
    buildCacheKey(query, options) {
        const queryConditions = JSON.stringify(query.getQuery());
        const populate = JSON.stringify(query.getPopulatedPaths());
        const select = JSON.stringify(query.getOptions().select);
        const keyParts = [queryConditions, populate, select, options.page, options.limit, options.sort, options.order];
        // Create a hash of the key parts for consistent caching
        const keyString = keyParts.join("|");
        return Buffer.from(keyString).toString("base64").slice(0, 50);
    }
    /**
     * Invalidate cache for specific patterns
     */
    async invalidateCache(pattern) {
        return this.cache.invalidatePattern(pattern);
    }
    /**
     * Clear all pagination cache
     */
    async clearCache() {
        return this.cache.invalidatePattern("*");
    }
}
exports.OptimizedPagination = OptimizedPagination;
/**
 * Cursor-based pagination for better performance with large datasets
 */
class CursorPagination {
    cache;
    constructor(cachePrefix = "cursor") {
        this.cache = new performance_1.CacheWrapper(cachePrefix, 300);
    }
    /**
     * Execute cursor-based pagination
     */
    async paginate(query, options = {}) {
        const startTime = Date.now();
        const limit = Math.min(options.limit || 20, 100);
        const sortField = options.sortField || "_id";
        const sortOrder = options.sortOrder || "desc";
        // Build cache key
        const cacheKey = this.buildCursorCacheKey(query, options);
        // Try cache first
        if (options.cacheTTL && options.cacheTTL > 0) {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return {
                    ...cached,
                    data: cached.data || [],
                    hasMore: cached.hasMore || false,
                    meta: {
                        queryTime: Date.now() - startTime,
                        cached: true
                    }
                };
            }
        }
        // Apply cursor filter if provided
        if (options.cursor) {
            const cursorValue = this.decodeCursor(options.cursor);
            const operator = sortOrder === "desc" ? "$lt" : "$gt";
            query = query.where(sortField).where(operator, cursorValue);
        }
        // Execute query with one extra item to check if there are more
        const sortObj = { [sortField]: sortOrder === "desc" ? -1 : 1 };
        const data = (await query
            .sort(sortObj)
            .limit(limit + 1)
            .lean({ virtuals: true })
            .exec());
        // Check if there are more items
        const hasMore = data.length > limit;
        if (hasMore) {
            data.pop(); // Remove the extra item
        }
        // Generate next cursor
        const nextCursor = hasMore && data.length > 0 ? this.encodeCursor(data[data.length - 1][sortField]) : undefined;
        const result = {
            data,
            nextCursor,
            hasMore,
            meta: {
                queryTime: Date.now() - startTime,
                cached: false
            }
        };
        // Cache the result
        if (options.cacheTTL && options.cacheTTL > 0) {
            await this.cache.set(cacheKey, result, options.cacheTTL);
        }
        return result;
    }
    buildCursorCacheKey(query, options) {
        const queryConditions = JSON.stringify(query.getQuery());
        const keyParts = [queryConditions, options.cursor, options.limit, options.sortField, options.sortOrder];
        const keyString = keyParts.join("|");
        return Buffer.from(keyString).toString("base64").slice(0, 50);
    }
    encodeCursor(value) {
        return Buffer.from(JSON.stringify(value)).toString("base64");
    }
    decodeCursor(cursor) {
        try {
            return JSON.parse(Buffer.from(cursor, "base64").toString());
        }
        catch {
            throw new Error("Invalid cursor");
        }
    }
}
exports.CursorPagination = CursorPagination;
// Export singleton instances
exports.optimizedPagination = new OptimizedPagination();
exports.cursorPagination = new CursorPagination();
/**
 * Helper function for quick pagination
 */
async function paginateQuery(query, options = {}) {
    return exports.optimizedPagination.paginate(query, options);
}
