import { Document, Query } from "mongoose";
import { logger } from "./logger";
import { CacheWrapper } from "./performance";

/**
 * High-performance pagination utility with caching and optimization
 */

export interface PaginationOptions {
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
    maxLimit?: number;
    defaultLimit?: number;
    cacheTTL?: number;
    cacheKey?: string;
}

export interface PaginationResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextPage?: number;
        prevPage?: number;
    };
    meta?: {
        cached: boolean;
        queryTime: number;
        cacheKey?: string;
    };
}

export interface SortOptions {
    [key: string]: 1 | -1;
}

/**
 * Optimized pagination class with intelligent caching
 */
export class OptimizedPagination {
    private cache: CacheWrapper;
    private defaultOptions: Required<Omit<PaginationOptions, "cacheKey">>;

    constructor(cachePrefix: string = "pagination") {
        this.cache = new CacheWrapper(cachePrefix, 300); // 5 minutes default TTL
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
    async paginate<T extends Document>(
        query: Query<T[], T>,
        options: PaginationOptions = {}
    ): Promise<PaginationResult<T>> {
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
            const cached = await this.cache.get<PaginationResult<T>>(cacheKey);
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

        const result: PaginationResult<T> = {
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
            logger.warn(`🐌 Slow pagination query: ${result.meta.queryTime}ms, total: ${total}, page: ${page}`);
        }

        return result;
    }

    /**
     * Execute optimized data query
     */
    private async executeDataQuery<T extends Document>(
        query: Query<T[], T>,
        sortObj: SortOptions,
        skip: number,
        limit: number
    ): Promise<T[]> {
        return query
            .sort(sortObj as any)
            .skip(skip)
            .limit(limit)
            .lean({ virtuals: true }) // Use lean for better performance
            .exec() as any;
    }

    /**
     * Execute optimized count query
     */
    private async executeCountQuery<T extends Document>(query: Query<T[], T>): Promise<number> {
        // Clone the query to avoid modifying the original
        const countQuery = query.clone();

        // Use countDocuments for better performance
        return countQuery.countDocuments().exec();
    }

    /**
     * Build sort object from string parameters
     */
    private buildSortObject(sort: string, order: "asc" | "desc"): SortOptions {
        const sortObj: SortOptions = {};

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
    private buildCacheKey(query: Query<any, any>, options: PaginationOptions): string {
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
    async invalidateCache(pattern: string): Promise<boolean> {
        return this.cache.invalidatePattern(pattern);
    }

    /**
     * Clear all pagination cache
     */
    async clearCache(): Promise<boolean> {
        return this.cache.invalidatePattern("*");
    }
}

/**
 * Cursor-based pagination for better performance with large datasets
 */
export class CursorPagination {
    private cache: CacheWrapper;

    constructor(cachePrefix: string = "cursor") {
        this.cache = new CacheWrapper(cachePrefix, 300);
    }

    /**
     * Execute cursor-based pagination
     */
    async paginate<T extends Document>(
        query: Query<T[], T>,
        options: {
            cursor?: string;
            limit?: number;
            sortField?: string;
            sortOrder?: "asc" | "desc";
            cacheTTL?: number;
        } = {}
    ): Promise<{
        data: T[];
        nextCursor?: string;
        hasMore: boolean;
        meta: {
            queryTime: number;
            cached: boolean;
        };
    }> {
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
                    data: (cached as any).data || [],
                    hasMore: (cached as any).hasMore || false,
                    meta: {
                        queryTime: Date.now() - startTime,
                        cached: true
                    }
                } as any;
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
            .sort(sortObj as any)
            .limit(limit + 1)
            .lean({ virtuals: true })
            .exec()) as any[];

        // Check if there are more items
        const hasMore = data.length > limit;
        if (hasMore) {
            data.pop(); // Remove the extra item
        }

        // Generate next cursor
        const nextCursor =
            hasMore && data.length > 0 ? this.encodeCursor((data[data.length - 1] as any)[sortField]) : undefined;

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

        return result as any;
    }

    private buildCursorCacheKey(query: Query<any, any>, options: any): string {
        const queryConditions = JSON.stringify(query.getQuery());
        const keyParts = [queryConditions, options.cursor, options.limit, options.sortField, options.sortOrder];

        const keyString = keyParts.join("|");
        return Buffer.from(keyString).toString("base64").slice(0, 50);
    }

    private encodeCursor(value: any): string {
        return Buffer.from(JSON.stringify(value)).toString("base64");
    }

    private decodeCursor(cursor: string): any {
        try {
            return JSON.parse(Buffer.from(cursor, "base64").toString());
        } catch {
            throw new Error("Invalid cursor");
        }
    }
}

// Export singleton instances
export const optimizedPagination = new OptimizedPagination();
export const cursorPagination = new CursorPagination();

/**
 * Helper function for quick pagination
 */
export async function paginateQuery<T extends Document>(
    query: Query<T[], T>,
    options: PaginationOptions = {}
): Promise<PaginationResult<T>> {
    return optimizedPagination.paginate(query, options);
}
