"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionCache = exports.SessionCacheService = exports.cacheService = exports.AdvancedCacheService = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const performance_1 = require("../utils/performance");
class AdvancedCacheService {
    stats = new Map();
    strategies = new Map();
    inMemoryCache = new Map();
    maxMemoryCacheSize = 100 * 1024 * 1024; // 100MB
    currentMemoryUsage = 0;
    constructor() {
        this.setupDefaultStrategies();
        this.startCleanupInterval();
        this.startStatsReporting();
    }
    /**
     * Setup default caching strategies for different data types
     */
    setupDefaultStrategies() {
        // Product caching - medium TTL with refresh
        this.strategies.set(redis_1.CACHE_PREFIXES.PRODUCTS, {
            ttl: redis_1.CACHE_TTL.MEDIUM,
            refreshThreshold: 300, // Refresh when 5 minutes left
            compression: true
        });
        // Category caching - long TTL (rarely changes)
        this.strategies.set(redis_1.CACHE_PREFIXES.CATEGORIES, {
            ttl: redis_1.CACHE_TTL.VERY_LONG,
            refreshThreshold: 3600, // Refresh when 1 hour left
            compression: false
        });
        // Brand caching - long TTL
        this.strategies.set(redis_1.CACHE_PREFIXES.BRANDS, {
            ttl: redis_1.CACHE_TTL.VERY_LONG,
            refreshThreshold: 3600,
            compression: false
        });
        // User caching - short TTL for security
        this.strategies.set(redis_1.CACHE_PREFIXES.USERS, {
            ttl: redis_1.CACHE_TTL.SHORT,
            refreshThreshold: 60,
            compression: false
        });
        // Cart caching - short TTL
        this.strategies.set(redis_1.CACHE_PREFIXES.CARTS, {
            ttl: redis_1.CACHE_TTL.SHORT,
            refreshThreshold: 60,
            compression: false
        });
        // Search results - short TTL
        this.strategies.set(redis_1.CACHE_PREFIXES.SEARCH, {
            ttl: redis_1.CACHE_TTL.SHORT,
            refreshThreshold: 60,
            compression: true
        });
        // Session caching - medium TTL
        this.strategies.set(redis_1.CACHE_PREFIXES.SESSIONS, {
            ttl: redis_1.CACHE_TTL.MEDIUM,
            refreshThreshold: 300,
            compression: false
        });
    }
    /**
     * Get data with intelligent caching strategy
     */
    async get(prefix, key, fetchFunction) {
        const fullKey = `${prefix}:${key}`;
        const strategy = this.strategies.get(prefix);
        this.updateStats(prefix, "attempt");
        // Try in-memory cache first for frequently accessed data
        const memoryResult = this.getFromMemory(fullKey);
        if (memoryResult !== null) {
            this.updateStats(prefix, "hit");
            logger_1.logger.debug(`Memory cache hit: ${fullKey}`);
            return memoryResult;
        }
        // Try Redis cache if available
        if (redis_1.redisCache.isReady()) {
            try {
                const redisResult = await redis_1.redisCache.get(key, { prefix });
                if (redisResult !== null) {
                    this.updateStats(prefix, "hit");
                    // Store in memory cache for next time if it's small enough
                    this.setInMemory(fullKey, redisResult, strategy?.ttl || redis_1.CACHE_TTL.MEDIUM);
                    logger_1.logger.debug(`Redis cache hit: ${fullKey}`);
                    return redisResult;
                }
            }
            catch (error) {
                logger_1.logger.error(`Redis cache error for ${fullKey}:`, error);
            }
        }
        // Cache miss - fetch data if function provided
        if (fetchFunction) {
            this.updateStats(prefix, "miss");
            try {
                const data = await fetchFunction();
                // Store in both caches
                await this.set(prefix, key, data);
                logger_1.logger.debug(`Cache miss, fetched and stored: ${fullKey}`);
                return data;
            }
            catch (error) {
                logger_1.logger.error(`Error fetching data for ${fullKey}:`, error);
                return null;
            }
        }
        this.updateStats(prefix, "miss");
        return null;
    }
    /**
     * Set data with intelligent caching strategy
     */
    async set(prefix, key, data) {
        const fullKey = `${prefix}:${key}`;
        const strategy = this.strategies.get(prefix) || { ttl: redis_1.CACHE_TTL.MEDIUM };
        this.updateStats(prefix, "set");
        try {
            // Store in Redis
            const redisSuccess = await redis_1.redisCache.set(key, data, {
                prefix,
                ttl: strategy.ttl
            });
            // Store in memory cache if data is small enough
            this.setInMemory(fullKey, data, strategy.ttl);
            logger_1.logger.debug(`Data cached: ${fullKey} (TTL: ${strategy.ttl}s)`);
            return redisSuccess;
        }
        catch (error) {
            logger_1.logger.error(`Error caching data for ${fullKey}:`, error);
            return false;
        }
    }
    /**
     * Delete from all cache layers
     */
    async delete(prefix, key) {
        const fullKey = `${prefix}:${key}`;
        this.updateStats(prefix, "delete");
        // Delete from memory cache
        this.deleteFromMemory(fullKey);
        // Delete from Redis
        try {
            const redisSuccess = await redis_1.redisCache.del(key, prefix);
            logger_1.logger.debug(`Cache deleted: ${fullKey}`);
            return redisSuccess;
        }
        catch (error) {
            logger_1.logger.error(`Error deleting cache for ${fullKey}:`, error);
            return false;
        }
    }
    /**
     * Invalidate cache pattern
     */
    async invalidatePattern(prefix, pattern) {
        try {
            // Clear matching memory cache entries
            for (const [key] of this.inMemoryCache) {
                if (key.startsWith(`${prefix}:`) && key.includes(pattern)) {
                    this.deleteFromMemory(key);
                }
            }
            // Clear Redis pattern
            const success = await redis_1.redisCache.flush(`${prefix}:${pattern}`);
            logger_1.logger.info(`Cache pattern invalidated: ${prefix}:${pattern}`);
            return success;
        }
        catch (error) {
            logger_1.logger.error(`Error invalidating cache pattern ${prefix}:${pattern}:`, error);
            return false;
        }
    }
    /**
     * Warm up cache with frequently accessed data
     */
    async warmUp(warmUpFunctions) {
        logger_1.logger.info("🔥 Starting cache warm-up...");
        const promises = warmUpFunctions.map(async ({ prefix, key, fetchFn }) => {
            try {
                const data = await fetchFn();
                await this.set(prefix, key, data);
                logger_1.logger.debug(`Warmed up cache: ${prefix}:${key}`);
            }
            catch (error) {
                logger_1.logger.error(`Error warming up cache for ${prefix}:${key}:`, error);
            }
        });
        await Promise.allSettled(promises);
        logger_1.logger.info("✅ Cache warm-up completed");
    }
    /**
     * In-memory cache operations
     */
    getFromMemory(key) {
        const entry = this.inMemoryCache.get(key);
        if (!entry) {
            return null;
        }
        // Check if expired
        if (Date.now() > entry.expires) {
            this.deleteFromMemory(key);
            return null;
        }
        return entry.data;
    }
    setInMemory(key, data, ttl) {
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
    deleteFromMemory(key) {
        const entry = this.inMemoryCache.get(key);
        if (entry) {
            this.currentMemoryUsage -= entry.size;
            this.inMemoryCache.delete(key);
        }
    }
    evictLeastRecentlyUsed() {
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
    updateStats(prefix, operation) {
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
        const stats = this.stats.get(prefix);
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
    getStats() {
        return new Map(this.stats);
    }
    /**
     * Get memory usage statistics
     */
    getMemoryStats() {
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
    startCleanupInterval() {
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
                logger_1.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
            }
        }, 60000); // Clean up every minute
    }
    /**
     * Report statistics periodically
     */
    startStatsReporting() {
        if (process.env.NODE_ENV === "development") {
            setInterval(() => {
                const stats = this.getStats();
                const memStats = this.getMemoryStats();
                logger_1.logger.info("📊 Cache Statistics:", {
                    cacheStats: Object.fromEntries(stats),
                    memoryStats: memStats
                });
            }, 5 * 60 * 1000); // Report every 5 minutes in development
        }
    }
}
exports.AdvancedCacheService = AdvancedCacheService;
// Export singleton instance
exports.cacheService = new AdvancedCacheService();
/**
 * Session-specific caching service
 */
class SessionCacheService {
    cache;
    constructor() {
        this.cache = new performance_1.CacheWrapper(redis_1.CACHE_PREFIXES.SESSIONS, redis_1.CACHE_TTL.MEDIUM);
    }
    /**
     * Store session data
     */
    async setSession(sessionId, data, ttl) {
        try {
            return await this.cache.set(sessionId, data, ttl);
        }
        catch (error) {
            logger_1.logger.error("Error setting session cache:", error);
            return false;
        }
    }
    /**
     * Get session data
     */
    async getSession(sessionId) {
        try {
            return await this.cache.get(sessionId);
        }
        catch (error) {
            logger_1.logger.error("Error getting session cache:", error);
            return null;
        }
    }
    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        try {
            return await this.cache.del(sessionId);
        }
        catch (error) {
            logger_1.logger.error("Error deleting session cache:", error);
            return false;
        }
    }
    /**
     * Extend session TTL
     */
    async extendSession(sessionId, ttl) {
        try {
            const data = await this.getSession(sessionId);
            if (data) {
                return await this.setSession(sessionId, data, ttl);
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error("Error extending session:", error);
            return false;
        }
    }
}
exports.SessionCacheService = SessionCacheService;
exports.sessionCache = new SessionCacheService();
