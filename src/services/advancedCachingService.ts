import { redisCache } from '../config/redis';
import { logger } from '../utils/logger';
import { databaseOptimizationService } from './databaseOptimizationService';

/**
 * Advanced Multi-Layer Caching Service
 * Implements intelligent caching strategies with automatic invalidation and warming
 */

interface CacheConfig {
    ttl?: number;
    prefix?: string;
    tags?: string[];
    compress?: boolean;
    serialize?: boolean;
}

interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
    memoryUsage: number;
}

class AdvancedCachingService {
    private localCache = new Map<string, { value: any; expires: number; tags: string[] }>();
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
        memoryUsage: 0
    };
    private maxLocalCacheSize = 1000;
    private defaultTTL = 300; // 5 minutes

    constructor() {
        this.initializeCleanup();
    }

    private initializeCleanup(): void {
        // Clean expired local cache entries every minute
        setInterval(() => {
            this.cleanupLocalCache();
        }, 60 * 1000);

        // Update stats every 5 minutes
        setInterval(() => {
            this.updateStats();
        }, 5 * 60 * 1000);
    }

    private cleanupLocalCache(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.localCache.entries()) {
            if (entry.expires < now) {
                this.localCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`🧹 Cleaned ${cleaned} expired cache entries`);
        }

        // Limit cache size
        if (this.localCache.size > this.maxLocalCacheSize) {
            const excess = this.localCache.size - this.maxLocalCacheSize;
            const keys = Array.from(this.localCache.keys()).slice(0, excess);
            keys.forEach(key => this.localCache.delete(key));
            logger.debug(`🧹 Removed ${excess} cache entries to maintain size limit`);
        }
    }

    private updateStats(): void {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
        this.stats.memoryUsage = this.getMemoryUsage();

        logger.info('📊 Cache Performance Stats:', {
            hitRate: `${this.stats.hitRate.toFixed(2)}%`,
            totalRequests: total,
            localCacheSize: this.localCache.size,
            memoryUsage: `${this.stats.memoryUsage.toFixed(2)}MB`
        });
    }

    private getMemoryUsage(): number {
        let size = 0;
        for (const [key, value] of this.localCache.entries()) {
            size += key.length + JSON.stringify(value).length;
        }
        return size / 1024 / 1024; // Convert to MB
    }

    async get<T>(key: string, config: CacheConfig = {}): Promise<T | null> {
        const fullKey = config.prefix ? `${config.prefix}:${key}` : key;

        try {
            // Try local cache first (L1)
            const localEntry = this.localCache.get(fullKey);
            if (localEntry && localEntry.expires > Date.now()) {
                this.stats.hits++;
                databaseOptimizationService.recordCacheHit();
                logger.debug(`🎯 L1 Cache HIT: ${fullKey}`);
                return localEntry.value;
            }

            // Try Redis cache (L2)
            const redisValue = await redisCache.get<T>(fullKey);
            if (redisValue !== null) {
                this.stats.hits++;
                databaseOptimizationService.recordCacheHit();
                
                // Store in local cache for faster access
                this.setLocal(fullKey, redisValue, config.ttl || this.defaultTTL, config.tags || []);
                
                logger.debug(`🎯 L2 Cache HIT: ${fullKey}`);
                return redisValue;
            }

            // Cache miss
            this.stats.misses++;
            databaseOptimizationService.recordCacheMiss();
            logger.debug(`❌ Cache MISS: ${fullKey}`);
            return null;

        } catch (error) {
            this.stats.misses++;
            logger.error('Cache get error:', error);
            return null;
        }
    }

    async set(key: string, value: any, config: CacheConfig = {}): Promise<boolean> {
        const fullKey = config.prefix ? `${config.prefix}:${key}` : key;
        const ttl = config.ttl || this.defaultTTL;

        try {
            // Set in Redis (L2)
            const redisSuccess = await redisCache.set(fullKey, value, { ttl });
            
            // Set in local cache (L1)
            this.setLocal(fullKey, value, ttl, config.tags || []);

            if (redisSuccess) {
                this.stats.sets++;
                logger.debug(`💾 Cache SET: ${fullKey} (TTL: ${ttl}s)`);
            }

            return redisSuccess;

        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    }

    private setLocal(key: string, value: any, ttl: number, tags: string[]): void {
        const expires = Date.now() + (ttl * 1000);
        this.localCache.set(key, { value, expires, tags });
    }

    async del(key: string, prefix?: string): Promise<boolean> {
        const fullKey = prefix ? `${prefix}:${key}` : key;

        try {
            // Delete from local cache
            this.localCache.delete(fullKey);

            // Delete from Redis
            const redisSuccess = await redisCache.del(fullKey);

            if (redisSuccess) {
                this.stats.deletes++;
                logger.debug(`🗑️ Cache DEL: ${fullKey}`);
            }

            return redisSuccess;

        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    }

    async invalidateByTag(tag: string): Promise<number> {
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
            logger.info(`🧹 Invalidated ${invalidated} cache entries with tag: ${tag}`);

            return invalidated;

        } catch (error) {
            logger.error('Cache invalidation error:', error);
            return 0;
        }
    }

    async getOrSet<T>(
        key: string,
        fetchFunction: () => Promise<T>,
        config: CacheConfig = {}
    ): Promise<T | null> {
        // Try to get from cache first
        const cached = await this.get<T>(key, config);
        if (cached !== null) {
            return cached;
        }

        try {
            // Fetch data
            const data = await fetchFunction();
            
            // Store in cache
            await this.set(key, data, config);
            
            return data;

        } catch (error) {
            logger.error('Error in getOrSet:', error);
            return null;
        }
    }

    async warmUp(warmUpFunctions: Array<{ key: string; fn: () => Promise<any>; config?: CacheConfig }>): Promise<void> {
        logger.info(`🔥 Starting cache warm-up for ${warmUpFunctions.length} entries...`);

        const promises = warmUpFunctions.map(async ({ key, fn, config = {} }) => {
            try {
                const data = await fn();
                await this.set(key, data, config);
                logger.debug(`🔥 Warmed up: ${key}`);
            } catch (error) {
                logger.error(`❌ Failed to warm up ${key}:`, error);
            }
        });

        await Promise.allSettled(promises);
        logger.info('✅ Cache warm-up completed');
    }

    async flush(pattern?: string): Promise<boolean> {
        try {
            if (pattern) {
                // Clear local cache entries matching pattern
                const regex = new RegExp(pattern.replace('*', '.*'));
                for (const key of this.localCache.keys()) {
                    if (regex.test(key)) {
                        this.localCache.delete(key);
                    }
                }
            } else {
                // Clear all local cache
                this.localCache.clear();
            }

            // Clear Redis cache
            const redisSuccess = await redisCache.flush(pattern);
            
            logger.info(`🧹 Cache flushed${pattern ? ` (pattern: ${pattern})` : ''}`);
            return redisSuccess;

        } catch (error) {
            logger.error('Cache flush error:', error);
            return false;
        }
    }

    getStats(): CacheStats {
        this.updateStats();
        return { ...this.stats };
    }

    // Specialized caching methods for common use cases
    async cacheUser(userId: string, userData: any, ttl = 1800): Promise<boolean> {
        return this.set(`user:${userId}`, userData, {
            ttl,
            prefix: 'auth',
            tags: ['user', 'auth']
        });
    }

    async getCachedUser(userId: string): Promise<any> {
        return this.get(`user:${userId}`, { prefix: 'auth' });
    }

    async cacheProduct(productId: string, productData: any, ttl = 3600): Promise<boolean> {
        return this.set(`product:${productId}`, productData, {
            ttl,
            prefix: 'catalog',
            tags: ['product', 'catalog']
        });
    }

    async getCachedProduct(productId: string): Promise<any> {
        return this.get(`product:${productId}`, { prefix: 'catalog' });
    }

    async invalidateUserCache(userId: string): Promise<boolean> {
        return this.del(`user:${userId}`, 'auth');
    }

    async invalidateProductCache(productId: string): Promise<boolean> {
        return this.del(`product:${productId}`, 'catalog');
    }
}

// Singleton instance
export const advancedCachingService = new AdvancedCachingService();

/**
 * Cache decorators for easy method caching
 */
export function Cacheable(config: CacheConfig = {}) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
            
            return advancedCachingService.getOrSet(
                cacheKey,
                () => method.apply(this, args),
                config
            );
        };

        return descriptor;
    };
}

/**
 * Cache invalidation decorator
 */
export function InvalidateCache(keys: string[] | ((args: any[]) => string[])) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const result = await method.apply(this, args);
            
            const keysToInvalidate = typeof keys === 'function' ? keys(args) : keys;
            
            for (const key of keysToInvalidate) {
                await advancedCachingService.del(key);
            }

            return result;
        };

        return descriptor;
    };
}
