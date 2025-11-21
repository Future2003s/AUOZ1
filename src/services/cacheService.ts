import { redisCache, CACHE_PREFIXES, CACHE_TTL } from "../config/redis";
import { logger } from "../utils/logger";
import { CacheWrapper } from "../utils/performance";

/**
 * Advanced caching service with intelligent cache management
 */

interface CacheStrategy {
    ttl: number;
    refreshThreshold?: number; // Refresh cache when TTL is below this value
    maxSize?: number;
    compression?: boolean;
}

interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
    totalOperations: number;
}

export class AdvancedCacheService {
    private stats: Map<string, CacheStats> = new Map();
    private strategies: Map<string, CacheStrategy> = new Map();
    private inMemoryCache: Map<string, { data: any; expires: number; size: number }> = new Map();
    private maxMemoryCacheSize: number = 100 * 1024 * 1024; // 100MB
    private currentMemoryUsage: number = 0;

    constructor() {
        this.setupDefaultStrategies();
        this.startCleanupInterval();
        this.startStatsReporting();
    }

    /**
     * Setup default caching strategies for different data types
     */
    private setupDefaultStrategies(): void {
        // Product caching - medium TTL with refresh
        this.strategies.set(CACHE_PREFIXES.PRODUCTS, {
            ttl: CACHE_TTL.MEDIUM,
            refreshThreshold: 300, // Refresh when 5 minutes left
            compression: true
        });

        // Category caching - long TTL (rarely changes)
        this.strategies.set(CACHE_PREFIXES.CATEGORIES, {
            ttl: CACHE_TTL.VERY_LONG,
            refreshThreshold: 3600, // Refresh when 1 hour left
            compression: false
        });

        // Brand caching - long TTL
        this.strategies.set(CACHE_PREFIXES.BRANDS, {
            ttl: CACHE_TTL.VERY_LONG,
            refreshThreshold: 3600,
            compression: false
        });

        // User caching - short TTL for security
        this.strategies.set(CACHE_PREFIXES.USERS, {
            ttl: CACHE_TTL.SHORT,
            refreshThreshold: 60,
            compression: false
        });

        // Cart caching - short TTL
        this.strategies.set(CACHE_PREFIXES.CARTS, {
            ttl: CACHE_TTL.SHORT,
            refreshThreshold: 60,
            compression: false
        });

        // Search results - short TTL
        this.strategies.set(CACHE_PREFIXES.SEARCH, {
            ttl: CACHE_TTL.SHORT,
            refreshThreshold: 60,
            compression: true
        });

        // Session caching - medium TTL
        this.strategies.set(CACHE_PREFIXES.SESSIONS, {
            ttl: CACHE_TTL.MEDIUM,
            refreshThreshold: 300,
            compression: false
        });
    }

    /**
     * Get data with intelligent caching strategy
     */
    async get<T>(prefix: string, key: string, fetchFunction?: () => Promise<T>): Promise<T | null> {
        const fullKey = `${prefix}:${key}`;
        const strategy = this.strategies.get(prefix);

        this.updateStats(prefix, "attempt");

        // Try in-memory cache first for frequently accessed data
        const memoryResult = this.getFromMemory<T>(fullKey);
        if (memoryResult !== null) {
            this.updateStats(prefix, "hit");
            logger.debug(`Memory cache hit: ${fullKey}`);
            return memoryResult;
        }

        // Try Redis cache if available
        if (redisCache.isReady()) {
            try {
                const redisResult = await redisCache.get<T>(key, { prefix });

                if (redisResult !== null) {
                    this.updateStats(prefix, "hit");

                    // Store in memory cache for next time if it's small enough
                    this.setInMemory(fullKey, redisResult, strategy?.ttl || CACHE_TTL.MEDIUM);

                    logger.debug(`Redis cache hit: ${fullKey}`);
                    return redisResult;
                }
            } catch (error) {
                logger.error(`Redis cache error for ${fullKey}:`, error);
            }
        }

        // Cache miss - fetch data if function provided
        if (fetchFunction) {
            this.updateStats(prefix, "miss");

            try {
                const data = await fetchFunction();

                // Store in both caches
                await this.set(prefix, key, data);

                logger.debug(`Cache miss, fetched and stored: ${fullKey}`);
                return data;
            } catch (error) {
                logger.error(`Error fetching data for ${fullKey}:`, error);
                return null;
            }
        }

        this.updateStats(prefix, "miss");
        return null;
    }

    /**
     * Set data with intelligent caching strategy
     */
    async set(prefix: string, key: string, data: any): Promise<boolean> {
        const fullKey = `${prefix}:${key}`;
        const strategy = this.strategies.get(prefix) || { ttl: CACHE_TTL.MEDIUM };

        this.updateStats(prefix, "set");

        try {
            // Store in Redis
            const redisSuccess = await redisCache.set(key, data, {
                prefix,
                ttl: strategy.ttl
            });

            // Store in memory cache if data is small enough
            this.setInMemory(fullKey, data, strategy.ttl);

            logger.debug(`Data cached: ${fullKey} (TTL: ${strategy.ttl}s)`);
            return redisSuccess;
        } catch (error) {
            logger.error(`Error caching data for ${fullKey}:`, error);
            return false;
        }
    }

    /**
     * Delete from all cache layers
     */
    async delete(prefix: string, key: string): Promise<boolean> {
        const fullKey = `${prefix}:${key}`;

        this.updateStats(prefix, "delete");

        // Delete from memory cache
        this.deleteFromMemory(fullKey);

        // Delete from Redis
        try {
            const redisSuccess = await redisCache.del(key, prefix);
            logger.debug(`Cache deleted: ${fullKey}`);
            return redisSuccess;
        } catch (error) {
            logger.error(`Error deleting cache for ${fullKey}:`, error);
            return false;
        }
    }

    /**
     * Invalidate cache pattern
     */
    async invalidatePattern(prefix: string, pattern: string): Promise<boolean> {
        try {
            // Clear matching memory cache entries
            for (const [key] of this.inMemoryCache) {
                if (key.startsWith(`${prefix}:`) && key.includes(pattern)) {
                    this.deleteFromMemory(key);
                }
            }

            // Clear Redis pattern
            const success = await redisCache.flush(`${prefix}:${pattern}`);

            logger.info(`Cache pattern invalidated: ${prefix}:${pattern}`);
            return success;
        } catch (error) {
            logger.error(`Error invalidating cache pattern ${prefix}:${pattern}:`, error);
            return false;
        }
    }

    /**
     * Warm up cache with frequently accessed data
     */
    async warmUp(warmUpFunctions: Array<{ prefix: string; key: string; fetchFn: () => Promise<any> }>): Promise<void> {
        logger.info("🔥 Starting cache warm-up...");

        const promises = warmUpFunctions.map(async ({ prefix, key, fetchFn }) => {
            try {
                const data = await fetchFn();
                await this.set(prefix, key, data);
                logger.debug(`Warmed up cache: ${prefix}:${key}`);
            } catch (error) {
                logger.error(`Error warming up cache for ${prefix}:${key}:`, error);
            }
        });

        await Promise.allSettled(promises);
        logger.info("✅ Cache warm-up completed");
    }

    /**
     * In-memory cache operations
     */
    private getFromMemory<T>(key: string): T | null {
        const entry = this.inMemoryCache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expires) {
            this.deleteFromMemory(key);
            return null;
        }

        return entry.data as T;
    }

    private setInMemory(key: string, data: any, ttl: number): void {
        const serialized = JSON.stringify(data);
        const size = Buffer.byteLength(serialized, "utf8");

        // Don't cache large objects in memory
        if (size > 1024 * 1024) {
            // 1MB limit per item
            return;
        }

        // Check if we need to free up memory
        if (this.currentMemoryUsage + size > this.maxMemoryCacheSize) {
            this.evictLeastRecentlyUsed();
        }

        const expires = Date.now() + ttl * 1000;
        this.inMemoryCache.set(key, { data, expires, size });
        this.currentMemoryUsage += size;
    }

    private deleteFromMemory(key: string): void {
        const entry = this.inMemoryCache.get(key);
        if (entry) {
            this.currentMemoryUsage -= entry.size;
            this.inMemoryCache.delete(key);
        }
    }

    private evictLeastRecentlyUsed(): void {
        // Simple LRU eviction - remove oldest entries
        const entries = Array.from(this.inMemoryCache.entries());
        const toRemove = Math.ceil(entries.length * 0.1); // Remove 10% of entries

        for (let i = 0; i < toRemove && entries.length > 0; i++) {
            const [key] = entries[i];
            this.deleteFromMemory(key);
        }
    }

    /**
     * Statistics tracking
     */
    private updateStats(prefix: string, operation: "hit" | "miss" | "set" | "delete" | "attempt"): void {
        if (!this.stats.has(prefix)) {
            this.stats.set(prefix, {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                hitRate: 0,
                totalOperations: 0
            });
        }

        const stats = this.stats.get(prefix)!;

        switch (operation) {
            case "hit":
                stats.hits++;
                break;
            case "miss":
                stats.misses++;
                break;
            case "set":
                stats.sets++;
                break;
            case "delete":
                stats.deletes++;
                break;
        }

        stats.totalOperations = stats.hits + stats.misses + stats.sets + stats.deletes;
        stats.hitRate = stats.totalOperations > 0 ? (stats.hits / (stats.hits + stats.misses)) * 100 : 0;
    }

    /**
     * Get cache statistics
     */
    getStats(): Map<string, CacheStats> {
        return new Map(this.stats);
    }

    /**
     * Get memory usage statistics
     */
    getMemoryStats(): any {
        return {
            totalEntries: this.inMemoryCache.size,
            currentUsage: this.currentMemoryUsage,
            maxUsage: this.maxMemoryCacheSize,
            usagePercentage: (this.currentMemoryUsage / this.maxMemoryCacheSize) * 100
        };
    }

    /**
     * Cleanup expired entries
     */
    private startCleanupInterval(): void {
        setInterval(() => {
            const now = Date.now();
            let cleaned = 0;

            for (const [key, entry] of this.inMemoryCache) {
                if (now > entry.expires) {
                    this.deleteFromMemory(key);
                    cleaned++;
                }
            }

            if (cleaned > 0) {
                logger.debug(`Cleaned up ${cleaned} expired cache entries`);
            }
        }, 60000); // Clean up every minute
    }

    /**
     * Report statistics periodically
     */
    private startStatsReporting(): void {
        if (process.env.NODE_ENV === "development") {
            setInterval(
                () => {
                    const stats = this.getStats();
                    const memStats = this.getMemoryStats();

                    logger.info("📊 Cache Statistics:", {
                        cacheStats: Object.fromEntries(stats),
                        memoryStats: memStats
                    });
                },
                5 * 60 * 1000
            ); // Report every 5 minutes in development
        }
    }
}

// Export singleton instance
export const cacheService = new AdvancedCacheService();

/**
 * Session-specific caching service
 */
export class SessionCacheService {
    private cache: CacheWrapper;

    constructor() {
        this.cache = new CacheWrapper(CACHE_PREFIXES.SESSIONS, CACHE_TTL.MEDIUM);
    }

    /**
     * Store session data
     */
    async setSession(sessionId: string, data: any, ttl?: number): Promise<boolean> {
        try {
            return await this.cache.set(sessionId, data, ttl);
        } catch (error) {
            logger.error("Error setting session cache:", error);
            return false;
        }
    }

    /**
     * Get session data
     */
    async getSession<T>(sessionId: string): Promise<T | null> {
        try {
            return await this.cache.get<T>(sessionId);
        } catch (error) {
            logger.error("Error getting session cache:", error);
            return null;
        }
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId: string): Promise<boolean> {
        try {
            return await this.cache.del(sessionId);
        } catch (error) {
            logger.error("Error deleting session cache:", error);
            return false;
        }
    }

    /**
     * Extend session TTL
     */
    async extendSession(sessionId: string, ttl: number): Promise<boolean> {
        try {
            const data = await this.getSession(sessionId);
            if (data) {
                return await this.setSession(sessionId, data, ttl);
            }
            return false;
        } catch (error) {
            logger.error("Error extending session:", error);
            return false;
        }
    }
}

export const sessionCache = new SessionCacheService();
