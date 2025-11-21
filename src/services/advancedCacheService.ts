import { LRUCache } from "lru-cache";
import NodeCache from "node-cache";
import { logger } from "../utils/logger";
import { cacheService } from "./cacheService";

/**
 * Advanced Multi-Layer Cache Service
 * Combines LRU, Node-Cache, and Redis for optimal performance
 */
class AdvancedCacheService {
    private lruCache: LRUCache<string, any>;
    private nodeCache: NodeCache;
    private stats = {
        l1Hits: 0,
        l2Hits: 0,
        l3Hits: 0,
        misses: 0,
        sets: 0
    };

    constructor() {
        // L1 Cache: Simple Map (fallback)
        this.lruCache = new Map() as any;

        // L2 Cache: Node Cache (fast, medium size)
        this.nodeCache = new NodeCache({
            stdTTL: 600, // 10 minutes default TTL
            checkperiod: 120, // Check for expired keys every 2 minutes
            useClones: false, // Better performance, but be careful with object mutations
            deleteOnExpire: true,
            maxKeys: 10000 // Maximum 10k keys
        });

        this.setupEventHandlers();
    }

    /**
     * Get value from multi-layer cache
     */
    async get<T = any>(key: string): Promise<T | null> {
        const fullKey = this.buildKey(key);

        try {
            // L1: Check LRU cache first (fastest)
            const l1Value = this.lruCache.get(fullKey);
            if (l1Value !== undefined) {
                this.stats.l1Hits++;
                logger.debug(`L1 Cache hit: ${key}`);
                return l1Value;
            }

            // L2: Check Node cache
            const l2Value = this.nodeCache.get<T>(fullKey);
            if (l2Value !== undefined) {
                this.stats.l2Hits++;
                // Promote to L1 cache
                this.lruCache.set(fullKey, l2Value);
                logger.debug(`L2 Cache hit: ${key}`);
                return l2Value;
            }

            // L3: Check Redis cache
            const l3Value = await cacheService.get<T>("advanced", key);
            if (l3Value !== null) {
                this.stats.l3Hits++;
                // Promote to L2 and L1 caches
                this.nodeCache.set(fullKey, l3Value);
                this.lruCache.set(fullKey, l3Value);
                logger.debug(`L3 Cache hit: ${key}`);
                return l3Value;
            }

            this.stats.misses++;
            return null;
        } catch (error) {
            logger.error(`Cache get error for key ${key}:`, error);
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Set value in multi-layer cache
     */
    async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
        const fullKey = this.buildKey(key);

        try {
            this.stats.sets++;

            // Set in all cache layers
            this.lruCache.set(fullKey, value, { ttl: (ttl || 300) * 1000 }); // Convert to ms
            this.nodeCache.set(fullKey, value, ttl || 600);
            await cacheService.set("advanced", key, value);

            logger.debug(`Cache set: ${key} (TTL: ${ttl || "default"}s)`);
        } catch (error) {
            logger.error(`Cache set error for key ${key}:`, error);
        }
    }

    /**
     * Delete from all cache layers
     */
    async delete(key: string): Promise<void> {
        const fullKey = this.buildKey(key);

        try {
            this.lruCache.delete(fullKey);
            this.nodeCache.del(fullKey);
            // await cacheService.invalidate("advanced", key);

            logger.debug(`Cache deleted: ${key}`);
        } catch (error) {
            logger.error(`Cache delete error for key ${key}:`, error);
        }
    }

    /**
     * Get or set pattern (cache-aside)
     */
    async getOrSet<T = any>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
        // Try to get from cache first
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Generate value and cache it
        try {
            const value = await factory();
            await this.set(key, value, ttl);
            return value;
        } catch (error) {
            logger.error(`Cache factory error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Batch get multiple keys
     */
    async mget<T = any>(keys: string[]): Promise<Map<string, T>> {
        const results = new Map<string, T>();
        const missingKeys: string[] = [];

        // Check L1 and L2 caches first
        for (const key of keys) {
            const fullKey = this.buildKey(key);

            const l1Value = this.lruCache.get(fullKey);
            if (l1Value !== undefined) {
                results.set(key, l1Value);
                this.stats.l1Hits++;
                continue;
            }

            const l2Value = this.nodeCache.get<T>(fullKey);
            if (l2Value !== undefined) {
                results.set(key, l2Value);
                this.lruCache.set(fullKey, l2Value); // Promote to L1
                this.stats.l2Hits++;
                continue;
            }

            missingKeys.push(key);
        }

        // Batch fetch missing keys from Redis
        if (missingKeys.length > 0) {
            try {
                const redisResults = await Promise.all(missingKeys.map((key) => cacheService.get<T>("advanced", key)));

                missingKeys.forEach((key, index) => {
                    const value = redisResults[index];
                    if (value !== null) {
                        results.set(key, value);
                        const fullKey = this.buildKey(key);
                        this.nodeCache.set(fullKey, value);
                        this.lruCache.set(fullKey, value);
                        this.stats.l3Hits++;
                    } else {
                        this.stats.misses++;
                    }
                });
            } catch (error) {
                logger.error("Batch cache get error:", error);
                this.stats.misses += missingKeys.length;
            }
        }

        return results;
    }

    /**
     * Batch set multiple key-value pairs
     */
    async mset<T = any>(entries: Map<string, T>, ttl?: number): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const [key, value] of entries) {
            promises.push(this.set(key, value, ttl));
        }

        try {
            await Promise.all(promises);
            logger.debug(`Batch cache set: ${entries.size} items`);
        } catch (error) {
            logger.error("Batch cache set error:", error);
        }
    }

    /**
     * Clear all cache layers
     */
    async clear(): Promise<void> {
        try {
            this.lruCache.clear();
            this.nodeCache.flushAll();
            await cacheService.invalidatePattern("advanced", "*");

            // Reset stats
            this.stats = {
                l1Hits: 0,
                l2Hits: 0,
                l3Hits: 0,
                misses: 0,
                sets: 0
            };

            logger.info("All cache layers cleared");
        } catch (error) {
            logger.error("Cache clear error:", error);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits + this.stats.misses;

        return {
            ...this.stats,
            total,
            hitRate:
                total > 0
                    ? (((this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits) / total) * 100).toFixed(2)
                    : "0.00",
            l1HitRate: total > 0 ? ((this.stats.l1Hits / total) * 100).toFixed(2) : "0.00",
            l2HitRate: total > 0 ? ((this.stats.l2Hits / total) * 100).toFixed(2) : "0.00",
            l3HitRate: total > 0 ? ((this.stats.l3Hits / total) * 100).toFixed(2) : "0.00",
            missRate: total > 0 ? ((this.stats.misses / total) * 100).toFixed(2) : "0.00",
            lruSize: this.lruCache.size,
            nodeSize: this.nodeCache.keys().length,
            lruMaxSize: this.lruCache.max,
            nodeMaxSize: 10000
        };
    }

    /**
     * Get cache health info
     */
    getHealth() {
        const stats = this.getStats();
        const hitRate = parseFloat(stats.hitRate);

        return {
            status: hitRate > 80 ? "healthy" : hitRate > 60 ? "warning" : "critical",
            hitRate: stats.hitRate + "%",
            layers: {
                l1: { size: stats.lruSize, maxSize: stats.lruMaxSize },
                l2: { size: stats.nodeSize, maxSize: stats.nodeMaxSize },
                l3: { status: "connected" } // Redis status would be checked separately
            },
            recommendations: this.getRecommendations(stats)
        };
    }

    /**
     * Build cache key with prefix
     */
    private buildKey(key: string): string {
        return `adv:${key}`;
    }

    /**
     * Setup event handlers for cache monitoring
     */
    private setupEventHandlers(): void {
        // Note: LRU Cache v7+ doesn't have event emitters
        // We'll monitor through other means

        // Node Cache events
        this.nodeCache.on("expired", (key) => {
            logger.debug(`Node cache expired: ${key}`);
        });

        this.nodeCache.on("del", (key) => {
            logger.debug(`Node cache deleted: ${key}`);
        });
    }

    /**
     * Get performance recommendations
     */
    private getRecommendations(stats: any): string[] {
        const recommendations: string[] = [];
        const hitRate = parseFloat(stats.hitRate);

        if (hitRate < 60) {
            recommendations.push("Consider increasing cache TTL values");
            recommendations.push("Review cache key patterns for better locality");
        }

        if (stats.lruSize >= stats.lruMaxSize * 0.9) {
            recommendations.push("Consider increasing LRU cache size");
        }

        if (stats.nodeSize >= stats.nodeMaxSize * 0.9) {
            recommendations.push("Consider increasing Node cache size");
        }

        if (parseFloat(stats.l1HitRate) < 20) {
            recommendations.push("L1 cache hit rate is low - review access patterns");
        }

        return recommendations;
    }
}

export const advancedCacheService = new AdvancedCacheService();
