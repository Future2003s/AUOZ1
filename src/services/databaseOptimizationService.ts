import mongoose from "mongoose";
import { logger } from "../utils/logger";
import { redisCache } from "../config/redis";

/**
 * Advanced Database Optimization Service
 * Provides comprehensive database monitoring, query optimization, and performance analytics
 */

interface QueryMetrics {
    collectionName: string;
    operation: string;
    duration: number;
    timestamp: Date;
    query?: any;
    options?: any;
}

interface DatabaseStats {
    totalQueries: number;
    slowQueries: number;
    averageQueryTime: number;
    cacheHitRate: number;
    connectionPoolStats: any;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
}

class DatabaseOptimizationService {
    private queryMetrics: QueryMetrics[] = [];
    private slowQueryThreshold = 100; // ms
    private maxMetricsHistory = 10000;
    private startTime = Date.now();
    private cacheHits = 0;
    private cacheMisses = 0;

    constructor() {
        this.initializeMonitoring();
    }

    private initializeMonitoring(): void {
        // Enhanced query monitoring
        this.setupQueryMonitoring();

        // Periodic cleanup and reporting
        setInterval(
            () => {
                this.cleanupOldMetrics();
                this.generatePerformanceReport();
            },
            5 * 60 * 1000
        ); // Every 5 minutes

        // Memory monitoring
        setInterval(() => {
            this.monitorMemoryUsage();
        }, 60 * 1000); // Every minute
    }

    private setupQueryMonitoring(): void {
        // Override mongoose query execution to capture metrics
        const originalExec = mongoose.Query.prototype.exec;

        mongoose.Query.prototype.exec = function (this: any) {
            const startTime = Date.now();
            const collectionName = this.getQuery ? this.getQuery().collection?.name || "unknown" : "unknown";
            const operation = this.op || "unknown";

            return originalExec
                .call(this)
                .then((result: any) => {
                    const duration = Date.now() - startTime;

                    // Record metrics
                    databaseOptimizationService.recordQuery({
                        collectionName,
                        operation,
                        duration,
                        timestamp: new Date(),
                        query: this.getQuery ? this.getQuery() : undefined,
                        options: this.getOptions ? this.getOptions() : undefined
                    });

                    return result;
                })
                .catch((error: any) => {
                    const duration = Date.now() - startTime;

                    // Record failed query
                    databaseOptimizationService.recordQuery({
                        collectionName,
                        operation: `${operation}_ERROR`,
                        duration,
                        timestamp: new Date(),
                        query: this.getQuery ? this.getQuery() : undefined
                    });

                    throw error;
                });
        };
    }

    recordQuery(metrics: QueryMetrics): void {
        this.queryMetrics.push(metrics);

        // Log slow queries
        if (metrics.duration > this.slowQueryThreshold) {
            logger.warn(`🐌 Slow Query Detected:`, {
                collection: metrics.collectionName,
                operation: metrics.operation,
                duration: `${metrics.duration}ms`,
                query: JSON.stringify(metrics.query, null, 2)
            });
        }

        // Maintain metrics history limit
        if (this.queryMetrics.length > this.maxMetricsHistory) {
            this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
        }
    }

    recordCacheHit(): void {
        this.cacheHits++;
    }

    recordCacheMiss(): void {
        this.cacheMisses++;
    }

    private cleanupOldMetrics(): void {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        this.queryMetrics = this.queryMetrics.filter((metric) => metric.timestamp > oneHourAgo);
    }

    private monitorMemoryUsage(): void {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const usagePercentage = (heapUsedMB / heapTotalMB) * 100;

        if (usagePercentage > 85) {
            logger.warn(`⚠️ High Memory Usage: ${heapUsedMB.toFixed(2)}MB (${usagePercentage.toFixed(1)}%)`);

            // Trigger garbage collection if available
            if (global.gc) {
                global.gc();
                logger.info("🧹 Garbage collection triggered");
            }
        }
    }

    private generatePerformanceReport(): void {
        const stats = this.getStats();

        logger.info("📊 Database Performance Report:", {
            totalQueries: stats.totalQueries,
            slowQueries: stats.slowQueries,
            slowQueryPercentage:
                stats.totalQueries > 0 ? ((stats.slowQueries / stats.totalQueries) * 100).toFixed(2) + "%" : "0%",
            averageQueryTime: `${stats.averageQueryTime.toFixed(2)}ms`,
            cacheHitRate: `${stats.cacheHitRate.toFixed(2)}%`,
            memoryUsage: `${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            uptime: `${Math.floor(stats.uptime / 1000 / 60)} minutes`
        });
    }

    getStats(): DatabaseStats {
        const totalQueries = this.queryMetrics.length;
        const slowQueries = this.queryMetrics.filter((m) => m.duration > this.slowQueryThreshold).length;
        const totalDuration = this.queryMetrics.reduce((sum, m) => sum + m.duration, 0);
        const averageQueryTime = totalQueries > 0 ? totalDuration / totalQueries : 0;

        const totalCacheRequests = this.cacheHits + this.cacheMisses;
        const cacheHitRate = totalCacheRequests > 0 ? (this.cacheHits / totalCacheRequests) * 100 : 0;

        return {
            totalQueries,
            slowQueries,
            averageQueryTime,
            cacheHitRate,
            connectionPoolStats: this.getConnectionPoolStats(),
            memoryUsage: process.memoryUsage(),
            uptime: Date.now() - this.startTime
        };
    }

    private getConnectionPoolStats(): any {
        try {
            const connection = mongoose.connection;
            return {
                readyState: connection.readyState,
                host: connection.host,
                port: connection.port,
                name: connection.name
            };
        } catch (error) {
            return { error: "Unable to get connection stats" };
        }
    }

    getSlowQueries(limit = 10): QueryMetrics[] {
        return this.queryMetrics
            .filter((m) => m.duration > this.slowQueryThreshold)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }

    getQueryStatsByCollection(): Map<string, { count: number; avgDuration: number; slowCount: number }> {
        const stats = new Map();

        this.queryMetrics.forEach((metric) => {
            const existing = stats.get(metric.collectionName) || { count: 0, totalDuration: 0, slowCount: 0 };

            existing.count++;
            existing.totalDuration += metric.duration;
            if (metric.duration > this.slowQueryThreshold) {
                existing.slowCount++;
            }

            stats.set(metric.collectionName, existing);
        });

        // Calculate averages
        stats.forEach((value, key) => {
            value.avgDuration = value.totalDuration / value.count;
            delete value.totalDuration;
        });

        return stats;
    }

    async optimizeIndexes(): Promise<void> {
        try {
            logger.info("🔍 Starting index optimization...");

            if (!mongoose.connection.db) {
                throw new Error("Database connection not available");
            }

            const collections = await mongoose.connection.db.listCollections().toArray();

            for (const collection of collections) {
                const collectionName = collection.name;
                const coll = mongoose.connection.db.collection(collectionName);

                // Get current indexes
                const indexes = await coll.indexes();
                logger.info(`📋 Collection ${collectionName} has ${indexes.length} indexes`);

                // Analyze index usage (if available)
                try {
                    const indexStats = await coll.aggregate([{ $indexStats: {} }]).toArray();

                    indexStats.forEach((stat) => {
                        if (stat.accesses.ops === 0) {
                            logger.warn(`⚠️ Unused index detected: ${stat.name} on ${collectionName}`);
                        }
                    });
                } catch (error) {
                    // Index stats not available in all MongoDB versions
                    logger.debug("Index stats not available for analysis");
                }
            }

            logger.info("✅ Index optimization analysis completed");
        } catch (error) {
            logger.error("❌ Error during index optimization:", error);
        }
    }

    async clearMetrics(): Promise<void> {
        this.queryMetrics = [];
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.startTime = Date.now();
        logger.info("🧹 Database metrics cleared");
    }
}

// Singleton instance
export const databaseOptimizationService = new DatabaseOptimizationService();

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
    static async executeWithCache<T>(
        cacheKey: string,
        queryFn: () => Promise<T>,
        ttl = 300 // 5 minutes default
    ): Promise<T> {
        try {
            // Try cache first
            const cached = await redisCache.get<T>(cacheKey);
            if (cached !== null) {
                databaseOptimizationService.recordCacheHit();
                return cached;
            }

            // Execute query
            databaseOptimizationService.recordCacheMiss();
            const result = await queryFn();

            // Cache result
            await redisCache.set(cacheKey, result, { ttl });

            return result;
        } catch (error) {
            databaseOptimizationService.recordCacheMiss();
            throw error;
        }
    }

    static createOptimizedQuery(model: any, conditions: any = {}) {
        return model
            .find(conditions)
            .lean() // Return plain objects instead of Mongoose documents
            .hint({ _id: 1 }) // Use index hint when appropriate
            .maxTimeMS(5000); // Set query timeout
    }

    static createPaginatedQuery(model: any, conditions: any = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        return {
            query: model.find(conditions).lean().skip(skip).limit(limit).maxTimeMS(5000),
            countQuery: model.countDocuments(conditions).maxTimeMS(5000)
        };
    }
}
