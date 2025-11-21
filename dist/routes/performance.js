"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const performance_1 = require("../utils/performance");
const cacheService_1 = require("../services/cacheService");
const rateLimiting_1 = require("../middleware/rateLimiting");
const logger_1 = require("../utils/logger");
const mongoose_1 = __importDefault(require("mongoose"));
const performanceController_1 = require("../controllers/performanceController");
const simpleCacheService_1 = require("../services/simpleCacheService");
/**
 * Performance monitoring and analytics routes
 * Only accessible by admin users
 */
const router = (0, express_1.Router)();
// Protect all performance routes - admin only
router.use(auth_1.protect);
router.use((0, auth_1.authorize)("admin"));
/**
 * Get overall performance metrics
 */
router.get("/metrics", async (req, res) => {
    try {
        const metrics = {
            performance: performance_1.performanceMonitor.getMetrics(),
            cache: {
                stats: Object.fromEntries(cacheService_1.cacheService.getStats()),
                memory: cacheService_1.cacheService.getMemoryStats()
            },
            database: {
                readyState: mongoose_1.default.connection.readyState,
                host: mongoose_1.default.connection.host,
                name: mongoose_1.default.connection.name
            },
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                platform: process.platform,
                nodeVersion: process.version
            },
            timestamp: new Date().toISOString()
        };
        res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        logger_1.logger.error("Error getting performance metrics:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get performance metrics"
        });
    }
});
/**
 * Get cache statistics
 */
router.get("/cache", async (req, res) => {
    try {
        const cacheStats = {
            stats: Object.fromEntries(cacheService_1.cacheService.getStats()),
            memory: cacheService_1.cacheService.getMemoryStats(),
            timestamp: new Date().toISOString()
        };
        res.json({
            success: true,
            data: cacheStats
        });
    }
    catch (error) {
        logger_1.logger.error("Error getting cache stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get cache statistics"
        });
    }
});
/**
 * Get rate limiting statistics
 */
router.get("/rate-limits", async (req, res) => {
    try {
        const timeframe = req.query.timeframe || "hour";
        const rateLimitStats = await rateLimiting_1.rateLimitAnalytics.getStats(timeframe);
        res.json({
            success: true,
            data: rateLimitStats
        });
    }
    catch (error) {
        logger_1.logger.error("Error getting rate limit stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get rate limiting statistics"
        });
    }
});
/**
 * Clear cache (admin operation)
 */
router.delete("/cache", async (req, res) => {
    try {
        const pattern = req.query.pattern;
        if (pattern) {
            // Clear specific pattern
            await cacheService_1.cacheService.invalidatePattern("products", pattern);
            logger_1.logger.info(`Cache pattern cleared: ${pattern} by admin: ${req.user.id}`);
        }
        else {
            // Clear all cache (dangerous operation)
            await cacheService_1.cacheService.invalidatePattern("products", "*");
            await cacheService_1.cacheService.invalidatePattern("categories", "*");
            await cacheService_1.cacheService.invalidatePattern("brands", "*");
            await cacheService_1.cacheService.invalidatePattern("users", "*");
            logger_1.logger.warn(`All cache cleared by admin: ${req.user.id}`);
        }
        res.json({
            success: true,
            message: pattern ? `Cache pattern '${pattern}' cleared` : "All cache cleared"
        });
    }
    catch (error) {
        logger_1.logger.error("Error clearing cache:", error);
        res.status(500).json({
            success: false,
            error: "Failed to clear cache"
        });
    }
});
/**
 * Clear rate limits (admin operation)
 */
router.delete("/rate-limits", async (req, res) => {
    try {
        const success = await rateLimiting_1.rateLimitAnalytics.clearAllLimits();
        if (success) {
            logger_1.logger.warn(`All rate limits cleared by admin: ${req.user.id}`);
            res.json({
                success: true,
                message: "All rate limits cleared"
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: "Failed to clear rate limits"
            });
        }
    }
    catch (error) {
        logger_1.logger.error("Error clearing rate limits:", error);
        res.status(500).json({
            success: false,
            error: "Failed to clear rate limits"
        });
    }
});
/**
 * Get database performance stats
 */
router.get("/database", async (req, res) => {
    try {
        const dbStats = {
            connection: {
                readyState: mongoose_1.default.connection.readyState,
                host: mongoose_1.default.connection.host,
                name: mongoose_1.default.connection.name,
                port: mongoose_1.default.connection.port
            },
            collections: {},
            timestamp: new Date().toISOString()
        };
        // Get collection stats
        const collections = ["users", "products", "categories", "brands", "carts", "orders", "reviews"];
        for (const collectionName of collections) {
            try {
                const collection = mongoose_1.default.connection.db?.collection(collectionName);
                if (collection) {
                    try {
                        const stats = await collection.stats();
                        dbStats.collections[collectionName] = {
                            count: stats.count || 0,
                            size: stats.size || 0,
                            avgObjSize: stats.avgObjSize || 0,
                            indexCount: stats.nindexes || 0,
                            totalIndexSize: stats.totalIndexSize || 0
                        };
                    }
                    catch (statsError) {
                        dbStats.collections[collectionName] = {
                            count: 0,
                            size: 0,
                            avgObjSize: 0,
                            indexCount: 0,
                            totalIndexSize: 0,
                            error: "Stats not available"
                        };
                    }
                }
            }
            catch (error) {
                logger_1.logger.warn(`Could not get stats for collection ${collectionName}:`, error);
            }
        }
        res.json({
            success: true,
            data: dbStats
        });
    }
    catch (error) {
        logger_1.logger.error("Error getting database stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get database statistics"
        });
    }
});
/**
 * Get system health check
 */
router.get("/health", async (req, res) => {
    try {
        const health = {
            status: "healthy",
            checks: {
                database: mongoose_1.default.connection.readyState === 1 ? "healthy" : "unhealthy",
                memory: process.memoryUsage().heapUsed < 1024 * 1024 * 1024 ? "healthy" : "warning", // 1GB threshold
                uptime: process.uptime() > 0 ? "healthy" : "unhealthy"
            },
            metrics: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            }
        };
        // Determine overall status
        const unhealthyChecks = Object.values(health.checks).filter((status) => status === "unhealthy");
        if (unhealthyChecks.length > 0) {
            health.status = "unhealthy";
        }
        else if (Object.values(health.checks).includes("warning")) {
            health.status = "warning";
        }
        const statusCode = health.status === "healthy" ? 200 : health.status === "warning" ? 200 : 503;
        res.status(statusCode).json({
            success: health.status !== "unhealthy",
            data: health
        });
    }
    catch (error) {
        logger_1.logger.error("Error getting health status:", error);
        res.status(503).json({
            success: false,
            error: "Health check failed"
        });
    }
});
/**
 * Run performance benchmark
 */
router.post("/benchmark", performanceController_1.runBenchmark);
/**
 * Test JSON performance
 */
router.get("/json-test", performanceController_1.testJsonPerformance);
/**
 * Get performance recommendations
 */
router.get("/recommendations", performanceController_1.getPerformanceRecommendations);
/**
 * Export performance data
 */
router.get("/export", performanceController_1.exportPerformanceData);
/**
 * Get simple cache statistics
 */
router.get("/cache/simple", async (req, res) => {
    try {
        const stats = {
            simple: simpleCacheService_1.simpleCacheService.getStats(),
            health: simpleCacheService_1.simpleCacheService.getHealth(),
            timestamp: new Date().toISOString()
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.logger.error("Error getting simple cache stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get simple cache statistics"
        });
    }
});
/**
 * Clear simple cache
 */
router.delete("/cache/simple", async (req, res) => {
    try {
        await simpleCacheService_1.simpleCacheService.clear();
        logger_1.logger.warn(`Simple cache cleared by admin: ${req.user?.id || "unknown"}`);
        res.json({
            success: true,
            message: "Simple cache cleared successfully"
        });
    }
    catch (error) {
        logger_1.logger.error("Error clearing simple cache:", error);
        res.status(500).json({
            success: false,
            error: "Failed to clear simple cache"
        });
    }
});
exports.default = router;
