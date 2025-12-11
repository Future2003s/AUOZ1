"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleCacheService = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const logger_1 = require("../utils/logger");
const cacheService_1 = require("./cacheService");
/**
 * Simplified Cache Service
 * Simple but effective caching without complex dependencies
 */
class SimpleCacheService {
    nodeCache;
    stats = {
        hits: 0,
        misses: 0,
        sets: 0
    };
    constructor() {
        // Node Cache (fast, medium size)
        this.nodeCache = new node_cache_1.default({
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
    async get(key) {
        const fullKey = this.buildKey(key);
        try {
            // Check Node cache first
            const nodeValue = this.nodeCache.get(fullKey);
            if (nodeValue !== undefined) {
                this.stats.hits++;
                logger_1.logger.debug(`Cache hit: ${key}`);
                return nodeValue;
            }
            // Check Redis cache
            const redisValue = await cacheService_1.cacheService.get("simple", key);
            if (redisValue !== null) {
                this.stats.hits++;
                // Promote to Node cache
                this.nodeCache.set(fullKey, redisValue);
                logger_1.logger.debug(`Redis cache hit: ${key}`);
                return redisValue;
            }
            this.stats.misses++;
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Cache get error for key ${key}:`, error);
            this.stats.misses++;
            return null;
        }
    }
    /**
     * Set value in cache
     */
    async set(key, value, ttl) {
        const fullKey = this.buildKey(key);
        try {
            this.stats.sets++;
            // Set in both cache layers
            this.nodeCache.set(fullKey, value, ttl || 600);
            await cacheService_1.cacheService.set("simple", key, value);
            logger_1.logger.debug(`Cache set: ${key} (TTL: ${ttl || "default"}s)`);
        }
        catch (error) {
            logger_1.logger.error(`Cache set error for key ${key}:`, error);
        }
    }
    /**
     * Delete from cache
     */
    async delete(key) {
        const fullKey = this.buildKey(key);
        try {
            this.nodeCache.del(fullKey);
            await cacheService_1.cacheService.invalidatePattern("simple", key);
            logger_1.logger.debug(`Cache deleted: ${key}`);
        }
        catch (error) {
            logger_1.logger.error(`Cache delete error for key ${key}:`, error);
        }
    }
    /**
     * Get or set pattern (cache-aside)
     */
    async getOrSet(key, factory, ttl) {
        // Try to get from cache first
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        // Generate value and cache it
        try {
            const value = await factory();
            await this.set(key, value, ttl);
            return value;
        }
        catch (error) {
            logger_1.logger.error(`Cache factory error for key ${key}:`, error);
            throw error;
        }
    }
    /**
     * Clear all caches
     */
    async clear() {
        try {
            this.nodeCache.flushAll();
            await cacheService_1.cacheService.invalidatePattern("simple", "*");
            // Reset stats
            this.stats = {
                hits: 0,
                misses: 0,
                sets: 0
            };
            logger_1.logger.info("Simple cache cleared");
        }
        catch (error) {
            logger_1.logger.error("Cache clear error:", error);
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
    isReady() {
        try {
            return this.nodeCache.keys().length >= 0; // Simple check
        }
        catch {
            return false;
        }
    }
    /**
     * Build cache key with prefix
     */
    buildKey(key) {
        return `simple:${key}`;
    }
    /**
     * Setup event handlers for cache monitoring
     */
    setupEventHandlers() {
        // Node Cache events
        this.nodeCache.on("expired", (key) => {
            logger_1.logger.debug(`Node cache expired: ${key}`);
        });
        this.nodeCache.on("del", (key) => {
            logger_1.logger.debug(`Node cache deleted: ${key}`);
        });
    }
    /**
     * Get performance recommendations
     */
    getRecommendations(stats) {
        const recommendations = [];
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
exports.simpleCacheService = new SimpleCacheService();
