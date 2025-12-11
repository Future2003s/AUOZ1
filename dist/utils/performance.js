"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryOptimizer = exports.QueryAnalyzer = exports.CacheWrapper = exports.performanceMiddleware = exports.performanceMonitor = void 0;
const logger_1 = require("./logger");
const redis_1 = require("../config/redis");
class PerformanceMonitor {
    metrics = {
        requestCount: 0,
        averageResponseTime: 0,
        slowQueries: 0,
        cacheHitRate: 0,
        memoryUsage: process.memoryUsage(),
        timestamp: new Date()
    };
    responseTimes = [];
    cacheHits = 0;
    cacheMisses = 0;
    slowQueryThreshold = 100; // ms
    constructor() {
        // Start performance monitoring
        this.startMonitoring();
    }
    startMonitoring() {
        // Log performance metrics every 5 minutes
        setInterval(() => {
            this.logPerformanceMetrics();
            this.resetMetrics();
        }, 5 * 60 * 1000);
        // Monitor memory usage every minute
        setInterval(() => {
            this.checkMemoryUsage();
        }, 60 * 1000);
    }
    recordRequest(responseTime) {
        this.metrics.requestCount++;
        this.responseTimes.push(responseTime);
        if (responseTime > this.slowQueryThreshold) {
            this.metrics.slowQueries++;
        }
        // Keep only last 1000 response times for memory efficiency
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
        this.updateAverageResponseTime();
    }
    recordCacheHit() {
        this.cacheHits++;
        this.updateCacheHitRate();
    }
    recordCacheMiss() {
        this.cacheMisses++;
        this.updateCacheHitRate();
    }
    updateAverageResponseTime() {
        if (this.responseTimes.length > 0) {
            const sum = this.responseTimes.reduce((a, b) => a + b, 0);
            this.metrics.averageResponseTime = sum / this.responseTimes.length;
        }
    }
    updateCacheHitRate() {
        const total = this.cacheHits + this.cacheMisses;
        if (total > 0) {
            this.metrics.cacheHitRate = (this.cacheHits / total) * 100;
        }
    }
    checkMemoryUsage() {
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage = memUsage;
        // Log warning if memory usage is high
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const usagePercentage = (heapUsedMB / heapTotalMB) * 100;
        if (usagePercentage > 80) {
            logger_1.logger.warn(`⚠️ High memory usage: ${heapUsedMB.toFixed(2)}MB (${usagePercentage.toFixed(1)}%)`);
        }
    }
    logPerformanceMetrics() {
        logger_1.logger.info('📊 Performance Metrics:', {
            requestCount: this.metrics.requestCount,
            averageResponseTime: `${this.metrics.averageResponseTime.toFixed(2)}ms`,
            slowQueries: this.metrics.slowQueries,
            cacheHitRate: `${this.metrics.cacheHitRate.toFixed(2)}%`,
            memoryUsage: {
                heapUsed: `${(this.metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                heapTotal: `${(this.metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
                external: `${(this.metrics.memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
            }
        });
    }
    resetMetrics() {
        this.metrics.requestCount = 0;
        this.metrics.slowQueries = 0;
        this.responseTimes = [];
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.metrics.timestamp = new Date();
    }
    getMetrics() {
        return { ...this.metrics };
    }
}
// Singleton instance
exports.performanceMonitor = new PerformanceMonitor();
/**
 * Performance middleware for Express
 */
const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function (...args) {
        const responseTime = Date.now() - startTime;
        exports.performanceMonitor.recordRequest(responseTime);
        // Log slow requests
        if (responseTime > 100) {
            logger_1.logger.warn(`🐌 Slow request: ${req.method} ${req.originalUrl} took ${responseTime}ms`);
        }
        originalEnd.apply(this, args);
    };
    next();
};
exports.performanceMiddleware = performanceMiddleware;
/**
 * Cache wrapper with performance monitoring
 */
class CacheWrapper {
    prefix;
    defaultTTL;
    constructor(prefix, defaultTTL = 3600) {
        this.prefix = prefix;
        this.defaultTTL = defaultTTL;
    }
    async get(key) {
        try {
            const result = await redis_1.redisCache.get(key, { prefix: this.prefix });
            if (result !== null) {
                exports.performanceMonitor.recordCacheHit();
                logger_1.logger.debug(`🎯 Cache HIT: ${this.prefix}:${key}`);
            }
            else {
                exports.performanceMonitor.recordCacheMiss();
                logger_1.logger.debug(`❌ Cache MISS: ${this.prefix}:${key}`);
            }
            return result;
        }
        catch (error) {
            exports.performanceMonitor.recordCacheMiss();
            logger_1.logger.error('Cache get error:', error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            const result = await redis_1.redisCache.set(key, value, {
                prefix: this.prefix,
                ttl: ttl || this.defaultTTL
            });
            if (result) {
                logger_1.logger.debug(`💾 Cache SET: ${this.prefix}:${key}`);
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Cache set error:', error);
            return false;
        }
    }
    async del(key) {
        try {
            const result = await redis_1.redisCache.del(key, this.prefix);
            if (result) {
                logger_1.logger.debug(`🗑️ Cache DEL: ${this.prefix}:${key}`);
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Cache delete error:', error);
            return false;
        }
    }
    async getOrSet(key, fetchFunction, ttl) {
        // Try to get from cache first
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        // If not in cache, fetch data
        try {
            const data = await fetchFunction();
            // Store in cache for next time
            await this.set(key, data, ttl);
            return data;
        }
        catch (error) {
            logger_1.logger.error('Error in getOrSet:', error);
            return null;
        }
    }
    async invalidatePattern(pattern) {
        try {
            const fullPattern = `${this.prefix}:${pattern}`;
            const result = await redis_1.redisCache.flush(fullPattern);
            if (result) {
                logger_1.logger.debug(`🧹 Cache INVALIDATE: ${fullPattern}`);
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Cache invalidate error:', error);
            return false;
        }
    }
}
exports.CacheWrapper = CacheWrapper;
/**
 * Query performance analyzer
 */
class QueryAnalyzer {
    static slowQueries = new Map();
    static async analyzeQuery(queryName, queryFunction) {
        const startTime = Date.now();
        try {
            const result = await queryFunction();
            const duration = Date.now() - startTime;
            // Track slow queries
            if (duration > 100) {
                const currentCount = this.slowQueries.get(queryName) || 0;
                this.slowQueries.set(queryName, currentCount + 1);
                logger_1.logger.warn(`🐌 Slow query: ${queryName} took ${duration}ms`);
            }
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.error(`❌ Query error: ${queryName} failed after ${duration}ms`, error);
            throw error;
        }
    }
    static getSlowQueryStats() {
        return Array.from(this.slowQueries.entries()).map(([query, count]) => ({
            query,
            count
        }));
    }
    static resetStats() {
        this.slowQueries.clear();
    }
}
exports.QueryAnalyzer = QueryAnalyzer;
/**
 * Memory optimization utilities
 */
class MemoryOptimizer {
    static objectPools = new Map();
    static getFromPool(poolName, createFn) {
        let pool = this.objectPools.get(poolName);
        if (!pool) {
            pool = [];
            this.objectPools.set(poolName, pool);
        }
        if (pool.length > 0) {
            return pool.pop();
        }
        return createFn();
    }
    static returnToPool(poolName, object) {
        let pool = this.objectPools.get(poolName);
        if (!pool) {
            pool = [];
            this.objectPools.set(poolName, pool);
        }
        // Limit pool size to prevent memory leaks
        if (pool.length < 100) {
            // Reset object properties if needed
            if (typeof object === 'object' && object !== null) {
                Object.keys(object).forEach(key => {
                    delete object[key];
                });
            }
            pool.push(object);
        }
    }
    static clearPools() {
        this.objectPools.clear();
        logger_1.logger.info('🧹 Object pools cleared');
    }
    static getPoolStats() {
        return Array.from(this.objectPools.entries()).map(([pool, objects]) => ({
            pool,
            size: objects.length
        }));
    }
}
exports.MemoryOptimizer = MemoryOptimizer;
