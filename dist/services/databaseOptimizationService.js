"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryOptimizer = exports.databaseOptimizationService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
const redis_1 = require("../config/redis");
class DatabaseOptimizationService {
    queryMetrics = [];
    slowQueryThreshold = 100; // ms
    maxMetricsHistory = 10000;
    startTime = Date.now();
    cacheHits = 0;
    cacheMisses = 0;
    constructor() {
        this.initializeMonitoring();
    }
    initializeMonitoring() {
        // Enhanced query monitoring
        this.setupQueryMonitoring();
        // Periodic cleanup and reporting
        setInterval(() => {
            this.cleanupOldMetrics();
            this.generatePerformanceReport();
        }, 5 * 60 * 1000); // Every 5 minutes
        // Memory monitoring
        setInterval(() => {
            this.monitorMemoryUsage();
        }, 60 * 1000); // Every minute
    }
    setupQueryMonitoring() {
        // Override mongoose query execution to capture metrics
        const originalExec = mongoose_1.default.Query.prototype.exec;
        mongoose_1.default.Query.prototype.exec = function () {
            const startTime = Date.now();
            const collectionName = this.getQuery ? this.getQuery().collection?.name || "unknown" : "unknown";
            const operation = this.op || "unknown";
            return originalExec
                .call(this)
                .then((result) => {
                const duration = Date.now() - startTime;
                // Record metrics
                exports.databaseOptimizationService.recordQuery({
                    collectionName,
                    operation,
                    duration,
                    timestamp: new Date(),
                    query: this.getQuery ? this.getQuery() : undefined,
                    options: this.getOptions ? this.getOptions() : undefined
                });
                return result;
            })
                .catch((error) => {
                const duration = Date.now() - startTime;
                // Record failed query
                exports.databaseOptimizationService.recordQuery({
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
    recordQuery(metrics) {
        this.queryMetrics.push(metrics);
        // Log slow queries
        if (metrics.duration > this.slowQueryThreshold) {
            logger_1.logger.warn(`🐌 Slow Query Detected:`, {
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
    recordCacheHit() {
        this.cacheHits++;
    }
    recordCacheMiss() {
        this.cacheMisses++;
    }
    cleanupOldMetrics() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        this.queryMetrics = this.queryMetrics.filter((metric) => metric.timestamp > oneHourAgo);
    }
    monitorMemoryUsage() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const usagePercentage = (heapUsedMB / heapTotalMB) * 100;
        if (usagePercentage > 85) {
            logger_1.logger.warn(`⚠️ High Memory Usage: ${heapUsedMB.toFixed(2)}MB (${usagePercentage.toFixed(1)}%)`);
            // Trigger garbage collection if available
            if (global.gc) {
                global.gc();
                logger_1.logger.info("🧹 Garbage collection triggered");
            }
        }
    }
    generatePerformanceReport() {
        const stats = this.getStats();
        logger_1.logger.info("📊 Database Performance Report:", {
            totalQueries: stats.totalQueries,
            slowQueries: stats.slowQueries,
            slowQueryPercentage: stats.totalQueries > 0 ? ((stats.slowQueries / stats.totalQueries) * 100).toFixed(2) + "%" : "0%",
            averageQueryTime: `${stats.averageQueryTime.toFixed(2)}ms`,
            cacheHitRate: `${stats.cacheHitRate.toFixed(2)}%`,
            memoryUsage: `${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            uptime: `${Math.floor(stats.uptime / 1000 / 60)} minutes`
        });
    }
    getStats() {
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
    getConnectionPoolStats() {
        try {
            const connection = mongoose_1.default.connection;
            return {
                readyState: connection.readyState,
                host: connection.host,
                port: connection.port,
                name: connection.name
            };
        }
        catch (error) {
            return { error: "Unable to get connection stats" };
        }
    }
    getSlowQueries(limit = 10) {
        return this.queryMetrics
            .filter((m) => m.duration > this.slowQueryThreshold)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }
    getQueryStatsByCollection() {
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
    async optimizeIndexes() {
        try {
            logger_1.logger.info("🔍 Starting index optimization...");
            if (!mongoose_1.default.connection.db) {
                throw new Error("Database connection not available");
            }
            const collections = await mongoose_1.default.connection.db.listCollections().toArray();
            for (const collection of collections) {
                const collectionName = collection.name;
                const coll = mongoose_1.default.connection.db.collection(collectionName);
                // Get current indexes
                const indexes = await coll.indexes();
                logger_1.logger.info(`📋 Collection ${collectionName} has ${indexes.length} indexes`);
                // Analyze index usage (if available)
                try {
                    const indexStats = await coll.aggregate([{ $indexStats: {} }]).toArray();
                    indexStats.forEach((stat) => {
                        if (stat.accesses.ops === 0) {
                            logger_1.logger.warn(`⚠️ Unused index detected: ${stat.name} on ${collectionName}`);
                        }
                    });
                }
                catch (error) {
                    // Index stats not available in all MongoDB versions
                    logger_1.logger.debug("Index stats not available for analysis");
                }
            }
            logger_1.logger.info("✅ Index optimization analysis completed");
        }
        catch (error) {
            logger_1.logger.error("❌ Error during index optimization:", error);
        }
    }
    async clearMetrics() {
        this.queryMetrics = [];
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.startTime = Date.now();
        logger_1.logger.info("🧹 Database metrics cleared");
    }
}
// Singleton instance
exports.databaseOptimizationService = new DatabaseOptimizationService();
/**
 * Query optimization utilities
 */
class QueryOptimizer {
    static async executeWithCache(cacheKey, queryFn, ttl = 300 // 5 minutes default
    ) {
        try {
            // Try cache first
            const cached = await redis_1.redisCache.get(cacheKey);
            if (cached !== null) {
                exports.databaseOptimizationService.recordCacheHit();
                return cached;
            }
            // Execute query
            exports.databaseOptimizationService.recordCacheMiss();
            const result = await queryFn();
            // Cache result
            await redis_1.redisCache.set(cacheKey, result, { ttl });
            return result;
        }
        catch (error) {
            exports.databaseOptimizationService.recordCacheMiss();
            throw error;
        }
    }
    static createOptimizedQuery(model, conditions = {}) {
        return model
            .find(conditions)
            .lean() // Return plain objects instead of Mongoose documents
            .hint({ _id: 1 }) // Use index hint when appropriate
            .maxTimeMS(5000); // Set query timeout
    }
    static createPaginatedQuery(model, conditions = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        return {
            query: model.find(conditions).lean().skip(skip).limit(limit).maxTimeMS(5000),
            countQuery: model.countDocuments(conditions).maxTimeMS(5000)
        };
    }
}
exports.QueryOptimizer = QueryOptimizer;
