import NodeCache from "node-cache";
import { logger } from "../utils/logger";
import { cacheService } from "./cacheService";

/**
 * Simplified Cache Service
 * Simple but effective caching without complex dependencies
 */
class SimpleCacheService {
    private nodeCache: NodeCache;
    private stats = {
        hits: 0,
        misses: 0,
        sets: 0
    };

    constructor() {
        // Node Cache (fast, medium size)
        this.nodeCache = new NodeCache({
            stdTTL: 600, // 10 minutes default TTL
            checkperiod: 120, // Check for expired keys every 2 minutes
            useClones: false, // Better performance
            deleteOnExpire: true,
            maxKeys: 10000 // Maximum 10k keys
        });

        this.setupEventHandlers();
    }

    /**
     * Get value from cache
     */
    async get<T = any>(key: string): Promise<T | null> {
        const fullKey = this.buildKey(key);

        try {
            // Check Node cache first
            const nodeValue = this.nodeCache.get<T>(fullKey);
            if (nodeValue !== undefined) {
                this.stats.hits++;
                logger.debug(`Cache hit: ${key}`);
                return nodeValue;
            }

            // Check Redis cache
            const redisValue = await cacheService.get<T>("simple", key);
            if (redisValue !== null) {
                this.stats.hits++;
                // Promote to Node cache
                this.nodeCache.set(fullKey, redisValue);
                logger.debug(`Redis cache hit: ${key}`);
                return redisValue;
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
     * Set value in cache
     */
    async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
        const fullKey = this.buildKey(key);

        try {
            this.stats.sets++;

            // Set in both cache layers
            this.nodeCache.set(fullKey, value, ttl || 600);
            await cacheService.set("simple", key, value);

            logger.debug(`Cache set: ${key} (TTL: ${ttl || "default"}s)`);
        } catch (error) {
            logger.error(`Cache set error for key ${key}:`, error);
        }
    }

    /**
     * Delete from cache
     */
    async delete(key: string): Promise<void> {
        const fullKey = this.buildKey(key);

        try {
            this.nodeCache.del(fullKey);
            await cacheService.invalidatePattern("simple", key);

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
     * Clear all caches
     */
    async clear(): Promise<void> {
        try {
            this.nodeCache.flushAll();
            await cacheService.invalidatePattern("simple", "*");

            // Reset stats
            this.stats = {
                hits: 0,
                misses: 0,
                sets: 0
            };

            logger.info("Simple cache cleared");
        } catch (error) {
            logger.error("Cache clear error:", error);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;

        return {
            ...this.stats,
            total,
            hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : "0.00",
            missRate: total > 0 ? ((this.stats.misses / total) * 100).toFixed(2) : "0.00",
            nodeSize: this.nodeCache.keys().length,
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
            nodeCache: { size: stats.nodeSize, maxSize: stats.nodeMaxSize },
            recommendations: this.getRecommendations(stats)
        };
    }

    /**
     * Check if cache is ready
     */
    isReady(): boolean {
        try {
            return this.nodeCache.keys().length >= 0; // Simple check
        } catch {
            return false;
        }
    }

    /**
     * Build cache key with prefix
     */
    private buildKey(key: string): string {
        return `simple:${key}`;
    }

    /**
     * Setup event handlers for cache monitoring
     */
    private setupEventHandlers(): void {
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

        if (stats.nodeSize >= stats.nodeMaxSize * 0.9) {
            recommendations.push("Consider increasing Node cache size");
        }

        return recommendations;
    }
}

export const simpleCacheService = new SimpleCacheService();
