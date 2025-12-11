"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedCachingService = void 0;
exports.Cacheable = Cacheable;
exports.InvalidateCache = InvalidateCache;
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const databaseOptimizationService_1 = require("./databaseOptimizationService");
class AdvancedCachingService {
    localCache = new Map();
    stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
        memoryUsage: 0
    };
    maxLocalCacheSize = 1000;
    defaultTTL = 300; // 5 minutes
    constructor() {
        this.initializeCleanup();
    }
    initializeCleanup() {
        // Clean expired local cache entries every minute
        setInterval(() => {
            this.cleanupLocalCache();
        }, 60 * 1000);
        // Update stats every 5 minutes
        setInterval(() => {
            this.updateStats();
        }, 5 * 60 * 1000);
    }
    cleanupLocalCache() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.localCache.entries()) {
            if (entry.expires < now) {
                this.localCache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger_1.logger.debug(`🧹 Cleaned ${cleaned} expired cache entries`);
        }
        // Limit cache size
        if (this.localCache.size > this.maxLocalCacheSize) {
            const excess = this.localCache.size - this.maxLocalCacheSize;
            const keys = Array.from(this.localCache.keys()).slice(0, excess);
            keys.forEach(key => this.localCache.delete(key));
            logger_1.logger.debug(`🧹 Removed ${excess} cache entries to maintain size limit`);
        }
    }
    updateStats() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
        this.stats.memoryUsage = this.getMemoryUsage();
        logger_1.logger.info('📊 Cache Performance Stats:', {
            hitRate: `${this.stats.hitRate.toFixed(2)}%`,
            totalRequests: total,
            localCacheSize: this.localCache.size,
            memoryUsage: `${this.stats.memoryUsage.toFixed(2)}MB`
        });
    }
    getMemoryUsage() {
        let size = 0;
        for (const [key, value] of this.localCache.entries()) {
            size += key.length + JSON.stringify(value).length;
        }
        return size / 1024 / 1024; // Convert to MB
    }
    async get(key, config = {}) {
        const fullKey = config.prefix ? `${config.prefix}:${key}` : key;
        try {
            // Try local cache first (L1)
            const localEntry = this.localCache.get(fullKey);
            if (localEntry && localEntry.expires > Date.now()) {
                this.stats.hits++;
                databaseOptimizationService_1.databaseOptimizationService.recordCacheHit();
                logger_1.logger.debug(`🎯 L1 Cache HIT: ${fullKey}`);
                return localEntry.value;
            }
            // Try Redis cache (L2)
            const redisValue = await redis_1.redisCache.get(fullKey);
            if (redisValue !== null) {
                this.stats.hits++;
                databaseOptimizationService_1.databaseOptimizationService.recordCacheHit();
                // Store in local cache for faster access
                this.setLocal(fullKey, redisValue, config.ttl || this.defaultTTL, config.tags || []);
                logger_1.logger.debug(`🎯 L2 Cache HIT: ${fullKey}`);
                return redisValue;
            }
            // Cache miss
            this.stats.misses++;
            databaseOptimizationService_1.databaseOptimizationService.recordCacheMiss();
            logger_1.logger.debug(`❌ Cache MISS: ${fullKey}`);
            return null;
        }
        catch (error) {
            this.stats.misses++;
            logger_1.logger.error('Cache get error:', error);
            return null;
        }
    }
    async set(key, value, config = {}) {
        const fullKey = config.prefix ? `${config.prefix}:${key}` : key;
        const ttl = config.ttl || this.defaultTTL;
        try {
            // Set in Redis (L2)
            const redisSuccess = await redis_1.redisCache.set(fullKey, value, { ttl });
            // Set in local cache (L1)
            this.setLocal(fullKey, value, ttl, config.tags || []);
            if (redisSuccess) {
                this.stats.sets++;
                logger_1.logger.debug(`💾 Cache SET: ${fullKey} (TTL: ${ttl}s)`);
            }
            return redisSuccess;
        }
        catch (error) {
            logger_1.logger.error('Cache set error:', error);
            return false;
        }
    }
    setLocal(key, value, ttl, tags) {
        const expires = Date.now() + (ttl * 1000);
        this.localCache.set(key, { value, expires, tags });
    }
    async del(key, prefix) {
        const fullKey = prefix ? `${prefix}:${key}` : key;
        try {
            // Delete from local cache
            this.localCache.delete(fullKey);
            // Delete from Redis
            const redisSuccess = await redis_1.redisCache.del(fullKey);
            if (redisSuccess) {
                this.stats.deletes++;
                logger_1.logger.debug(`🗑️ Cache DEL: ${fullKey}`);
            }
            return redisSuccess;
        }
        catch (error) {
            logger_1.logger.error('Cache delete error:', error);
            return false;
        }
    }
    async invalidateByTag(tag) {
        let invalidated = 0;
        try {
            // Invalidate local cache entries with tag
            for (const [key, entry] of this.localCache.entries()) {
                if (entry.tags.includes(tag)) {
                    this.localCache.delete(key);
                    invalidated++;
                }
            }
            // For Redis, we need to implement a tag-based invalidation system
            // This is a simplified version - in production, consider using Redis modules
            logger_1.logger.info(`🧹 Invalidated ${invalidated} cache entries with tag: ${tag}`);
            return invalidated;
        }
        catch (error) {
            logger_1.logger.error('Cache invalidation error:', error);
            return 0;
        }
    }
    async getOrSet(key, fetchFunction, config = {}) {
        // Try to get from cache first
        const cached = await this.get(key, config);
        if (cached !== null) {
            return cached;
        }
        try {
            // Fetch data
            const data = await fetchFunction();
            // Store in cache
            await this.set(key, data, config);
            return data;
        }
        catch (error) {
            logger_1.logger.error('Error in getOrSet:', error);
            return null;
        }
    }
    async warmUp(warmUpFunctions) {
        logger_1.logger.info(`🔥 Starting cache warm-up for ${warmUpFunctions.length} entries...`);
        const promises = warmUpFunctions.map(async ({ key, fn, config = {} }) => {
            try {
                const data = await fn();
                await this.set(key, data, config);
                logger_1.logger.debug(`🔥 Warmed up: ${key}`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Failed to warm up ${key}:`, error);
            }
        });
        await Promise.allSettled(promises);
        logger_1.logger.info('✅ Cache warm-up completed');
    }
    async flush(pattern) {
        try {
            if (pattern) {
                // Clear local cache entries matching pattern
                const regex = new RegExp(pattern.replace('*', '.*'));
                for (const key of this.localCache.keys()) {
                    if (regex.test(key)) {
                        this.localCache.delete(key);
                    }
                }
            }
            else {
                // Clear all local cache
                this.localCache.clear();
            }
            // Clear Redis cache
            const redisSuccess = await redis_1.redisCache.flush(pattern);
            logger_1.logger.info(`🧹 Cache flushed${pattern ? ` (pattern: ${pattern})` : ''}`);
            return redisSuccess;
        }
        catch (error) {
            logger_1.logger.error('Cache flush error:', error);
            return false;
        }
    }
    getStats() {
        this.updateStats();
        return { ...this.stats };
    }
    // Specialized caching methods for common use cases
    async cacheUser(userId, userData, ttl = 1800) {
        return this.set(`user:${userId}`, userData, {
            ttl,
            prefix: 'auth',
            tags: ['user', 'auth']
        });
    }
    async getCachedUser(userId) {
        return this.get(`user:${userId}`, { prefix: 'auth' });
    }
    async cacheProduct(productId, productData, ttl = 3600) {
        return this.set(`product:${productId}`, productData, {
            ttl,
            prefix: 'catalog',
            tags: ['product', 'catalog']
        });
    }
    async getCachedProduct(productId) {
        return this.get(`product:${productId}`, { prefix: 'catalog' });
    }
    async invalidateUserCache(userId) {
        return this.del(`user:${userId}`, 'auth');
    }
    async invalidateProductCache(productId) {
        return this.del(`product:${productId}`, 'catalog');
    }
}
// Singleton instance
exports.advancedCachingService = new AdvancedCachingService();
/**
 * Cache decorators for easy method caching
 */
function Cacheable(config = {}) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
            return exports.advancedCachingService.getOrSet(cacheKey, () => method.apply(this, args), config);
        };
        return descriptor;
    };
}
/**
 * Cache invalidation decorator
 */
function InvalidateCache(keys) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const result = await method.apply(this, args);
            const keysToInvalidate = typeof keys === 'function' ? keys(args) : keys;
            for (const key of keysToInvalidate) {
                await exports.advancedCachingService.del(key);
            }
            return result;
        };
        return descriptor;
    };
}
