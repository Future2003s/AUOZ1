import { logger } from './logger';
import { redisCache } from '../config/redis';

/**
 * Performance monitoring and optimization utilities
 */

interface PerformanceMetrics {
    requestCount: number;
    averageResponseTime: number;
    slowQueries: number;
    cacheHitRate: number;
    memoryUsage: NodeJS.MemoryUsage;
    timestamp: Date;
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics = {
        requestCount: 0,
        averageResponseTime: 0,
        slowQueries: 0,
        cacheHitRate: 0,
        memoryUsage: process.memoryUsage(),
        timestamp: new Date()
    };

    private responseTimes: number[] = [];
    private cacheHits: number = 0;
    private cacheMisses: number = 0;
    private slowQueryThreshold: number = 100; // ms

    constructor() {
        // Start performance monitoring
        this.startMonitoring();
    }

    private startMonitoring(): void {
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

    recordRequest(responseTime: number): void {
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

    recordCacheHit(): void {
        this.cacheHits++;
        this.updateCacheHitRate();
    }

    recordCacheMiss(): void {
        this.cacheMisses++;
        this.updateCacheHitRate();
    }

    private updateAverageResponseTime(): void {
        if (this.responseTimes.length > 0) {
            const sum = this.responseTimes.reduce((a, b) => a + b, 0);
            this.metrics.averageResponseTime = sum / this.responseTimes.length;
        }
    }

    private updateCacheHitRate(): void {
        const total = this.cacheHits + this.cacheMisses;
        if (total > 0) {
            this.metrics.cacheHitRate = (this.cacheHits / total) * 100;
        }
    }

    private checkMemoryUsage(): void {
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage = memUsage;

        // Log warning if memory usage is high
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const usagePercentage = (heapUsedMB / heapTotalMB) * 100;

        if (usagePercentage > 80) {
            logger.warn(`⚠️ High memory usage: ${heapUsedMB.toFixed(2)}MB (${usagePercentage.toFixed(1)}%)`);
        }
    }

    private logPerformanceMetrics(): void {
        logger.info('📊 Performance Metrics:', {
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

    private resetMetrics(): void {
        this.metrics.requestCount = 0;
        this.metrics.slowQueries = 0;
        this.responseTimes = [];
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.metrics.timestamp = new Date();
    }

    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance middleware for Express
 */
export const performanceMiddleware = (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
        const responseTime = Date.now() - startTime;
        performanceMonitor.recordRequest(responseTime);

        // Log slow requests
        if (responseTime > 100) {
            logger.warn(`🐌 Slow request: ${req.method} ${req.originalUrl} took ${responseTime}ms`);
        }

        originalEnd.apply(this, args);
    };

    next();
};

/**
 * Cache wrapper with performance monitoring
 */
export class CacheWrapper {
    private prefix: string;
    private defaultTTL: number;

    constructor(prefix: string, defaultTTL: number = 3600) {
        this.prefix = prefix;
        this.defaultTTL = defaultTTL;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const result = await redisCache.get<T>(key, { prefix: this.prefix });
            
            if (result !== null) {
                performanceMonitor.recordCacheHit();
                logger.debug(`🎯 Cache HIT: ${this.prefix}:${key}`);
            } else {
                performanceMonitor.recordCacheMiss();
                logger.debug(`❌ Cache MISS: ${this.prefix}:${key}`);
            }
            
            return result;
        } catch (error) {
            performanceMonitor.recordCacheMiss();
            logger.error('Cache get error:', error);
            return null;
        }
    }

    async set(key: string, value: any, ttl?: number): Promise<boolean> {
        try {
            const result = await redisCache.set(key, value, {
                prefix: this.prefix,
                ttl: ttl || this.defaultTTL
            });
            
            if (result) {
                logger.debug(`💾 Cache SET: ${this.prefix}:${key}`);
            }
            
            return result;
        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    }

    async del(key: string): Promise<boolean> {
        try {
            const result = await redisCache.del(key, this.prefix);
            
            if (result) {
                logger.debug(`🗑️ Cache DEL: ${this.prefix}:${key}`);
            }
            
            return result;
        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    }

    async getOrSet<T>(
        key: string,
        fetchFunction: () => Promise<T>,
        ttl?: number
    ): Promise<T | null> {
        // Try to get from cache first
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // If not in cache, fetch data
        try {
            const data = await fetchFunction();
            
            // Store in cache for next time
            await this.set(key, data, ttl);
            
            return data;
        } catch (error) {
            logger.error('Error in getOrSet:', error);
            return null;
        }
    }

    async invalidatePattern(pattern: string): Promise<boolean> {
        try {
            const fullPattern = `${this.prefix}:${pattern}`;
            const result = await redisCache.flush(fullPattern);
            
            if (result) {
                logger.debug(`🧹 Cache INVALIDATE: ${fullPattern}`);
            }
            
            return result;
        } catch (error) {
            logger.error('Cache invalidate error:', error);
            return false;
        }
    }
}

/**
 * Query performance analyzer
 */
export class QueryAnalyzer {
    private static slowQueries: Map<string, number> = new Map();

    static async analyzeQuery<T>(
        queryName: string,
        queryFunction: () => Promise<T>
    ): Promise<T> {
        const startTime = Date.now();
        
        try {
            const result = await queryFunction();
            const duration = Date.now() - startTime;
            
            // Track slow queries
            if (duration > 100) {
                const currentCount = this.slowQueries.get(queryName) || 0;
                this.slowQueries.set(queryName, currentCount + 1);
                
                logger.warn(`🐌 Slow query: ${queryName} took ${duration}ms`);
            }
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`❌ Query error: ${queryName} failed after ${duration}ms`, error);
            throw error;
        }
    }

    static getSlowQueryStats(): Array<{query: string, count: number}> {
        return Array.from(this.slowQueries.entries()).map(([query, count]) => ({
            query,
            count
        }));
    }

    static resetStats(): void {
        this.slowQueries.clear();
    }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
    private static objectPools: Map<string, any[]> = new Map();

    static getFromPool<T>(poolName: string, createFn: () => T): T {
        let pool = this.objectPools.get(poolName);
        
        if (!pool) {
            pool = [];
            this.objectPools.set(poolName, pool);
        }

        if (pool.length > 0) {
            return pool.pop() as T;
        }

        return createFn();
    }

    static returnToPool(poolName: string, object: any): void {
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

    static clearPools(): void {
        this.objectPools.clear();
        logger.info('🧹 Object pools cleared');
    }

    static getPoolStats(): Array<{pool: string, size: number}> {
        return Array.from(this.objectPools.entries()).map(([pool, objects]) => ({
            pool,
            size: objects.length
        }));
    }
}
