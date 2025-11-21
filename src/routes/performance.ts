import { Router, Request, Response } from "express";
import { protect, authorize } from "../middleware/auth";
import { performanceMonitor } from "../utils/performance";
import { cacheService } from "../services/cacheService";
import { rateLimitAnalytics } from "../middleware/rateLimiting";
import { logger } from "../utils/logger";
import mongoose from "mongoose";
import { validatePagination } from "../middleware/unifiedValidation";
import {
    runBenchmark,
    testJsonPerformance,
    getPerformanceRecommendations,
    exportPerformanceData
} from "../controllers/performanceController";
import { simpleCacheService } from "../services/simpleCacheService";
import { benchmarkService } from "../utils/benchmark";

/**
 * Performance monitoring and analytics routes
 * Only accessible by admin users
 */

const router = Router();

// Protect all performance routes - admin only
router.use(protect);
router.use(authorize("admin"));

/**
 * Get overall performance metrics
 */
router.get("/metrics", async (req: Request, res: Response) => {
    try {
        const metrics = {
            performance: performanceMonitor.getMetrics(),
            cache: {
                stats: Object.fromEntries(cacheService.getStats()),
                memory: cacheService.getMemoryStats()
            },
            database: {
                readyState: mongoose.connection.readyState,
                host: mongoose.connection.host,
                name: mongoose.connection.name
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
    } catch (error) {
        logger.error("Error getting performance metrics:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get performance metrics"
        });
    }
});

/**
 * Get cache statistics
 */
router.get("/cache", async (req: Request, res: Response) => {
    try {
        const cacheStats = {
            stats: Object.fromEntries(cacheService.getStats()),
            memory: cacheService.getMemoryStats(),
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: cacheStats
        });
    } catch (error) {
        logger.error("Error getting cache stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get cache statistics"
        });
    }
});

/**
 * Get rate limiting statistics
 */
router.get("/rate-limits", async (req: Request, res: Response) => {
    try {
        const timeframe = (req.query.timeframe as "hour" | "day" | "week") || "hour";
        const rateLimitStats = await rateLimitAnalytics.getStats(timeframe);

        res.json({
            success: true,
            data: rateLimitStats
        });
    } catch (error) {
        logger.error("Error getting rate limit stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get rate limiting statistics"
        });
    }
});

/**
 * Clear cache (admin operation)
 */
router.delete("/cache", async (req: Request, res: Response) => {
    try {
        const pattern = req.query.pattern as string;

        if (pattern) {
            // Clear specific pattern
            await cacheService.invalidatePattern("products", pattern);
            logger.info(`Cache pattern cleared: ${pattern} by admin: ${(req as any).user.id}`);
        } else {
            // Clear all cache (dangerous operation)
            await cacheService.invalidatePattern("products", "*");
            await cacheService.invalidatePattern("categories", "*");
            await cacheService.invalidatePattern("brands", "*");
            await cacheService.invalidatePattern("users", "*");
            logger.warn(`All cache cleared by admin: ${(req as any).user.id}`);
        }

        res.json({
            success: true,
            message: pattern ? `Cache pattern '${pattern}' cleared` : "All cache cleared"
        });
    } catch (error) {
        logger.error("Error clearing cache:", error);
        res.status(500).json({
            success: false,
            error: "Failed to clear cache"
        });
    }
});

/**
 * Clear rate limits (admin operation)
 */
router.delete("/rate-limits", async (req: Request, res: Response) => {
    try {
        const success = await rateLimitAnalytics.clearAllLimits();

        if (success) {
            logger.warn(`All rate limits cleared by admin: ${(req as any).user.id}`);
            res.json({
                success: true,
                message: "All rate limits cleared"
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to clear rate limits"
            });
        }
    } catch (error) {
        logger.error("Error clearing rate limits:", error);
        res.status(500).json({
            success: false,
            error: "Failed to clear rate limits"
        });
    }
});

/**
 * Get database performance stats
 */
router.get("/database", async (req: Request, res: Response) => {
    try {
        const dbStats = {
            connection: {
                readyState: mongoose.connection.readyState,
                host: mongoose.connection.host,
                name: mongoose.connection.name,
                port: mongoose.connection.port
            },
            collections: {},
            timestamp: new Date().toISOString()
        };

        // Get collection stats
        const collections = ["users", "products", "categories", "brands", "carts", "orders", "reviews"];

        for (const collectionName of collections) {
            try {
                const collection = mongoose.connection.db?.collection(collectionName);
                if (collection) {
                    try {
                        const stats = await (collection as any).stats();
                        (dbStats.collections as any)[collectionName] = {
                            count: stats.count || 0,
                            size: stats.size || 0,
                            avgObjSize: stats.avgObjSize || 0,
                            indexCount: stats.nindexes || 0,
                            totalIndexSize: stats.totalIndexSize || 0
                        };
                    } catch (statsError) {
                        (dbStats.collections as any)[collectionName] = {
                            count: 0,
                            size: 0,
                            avgObjSize: 0,
                            indexCount: 0,
                            totalIndexSize: 0,
                            error: "Stats not available"
                        };
                    }
                }
            } catch (error) {
                logger.warn(`Could not get stats for collection ${collectionName}:`, error);
            }
        }

        res.json({
            success: true,
            data: dbStats
        });
    } catch (error) {
        logger.error("Error getting database stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get database statistics"
        });
    }
});

/**
 * Get system health check
 */
router.get("/health", async (req: Request, res: Response) => {
    try {
        const health = {
            status: "healthy",
            checks: {
                database: mongoose.connection.readyState === 1 ? "healthy" : "unhealthy",
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
        } else if (Object.values(health.checks).includes("warning")) {
            health.status = "warning";
        }

        const statusCode = health.status === "healthy" ? 200 : health.status === "warning" ? 200 : 503;

        res.status(statusCode).json({
            success: health.status !== "unhealthy",
            data: health
        });
    } catch (error) {
        logger.error("Error getting health status:", error);
        res.status(503).json({
            success: false,
            error: "Health check failed"
        });
    }
});

/**
 * Run performance benchmark
 */
router.post("/benchmark", runBenchmark);

/**
 * Test JSON performance
 */
router.get("/json-test", testJsonPerformance);

/**
 * Get performance recommendations
 */
router.get("/recommendations", getPerformanceRecommendations);

/**
 * Export performance data
 */
router.get("/export", exportPerformanceData);

/**
 * Get simple cache statistics
 */
router.get("/cache/simple", async (req: Request, res: Response) => {
    try {
        const stats = {
            simple: simpleCacheService.getStats(),
            health: simpleCacheService.getHealth(),
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error("Error getting simple cache stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get simple cache statistics"
        });
    }
});

/**
 * Clear simple cache
 */
router.delete("/cache/simple", async (req: Request, res: Response) => {
    try {
        await simpleCacheService.clear();
        logger.warn(`Simple cache cleared by admin: ${(req as any).user?.id || "unknown"}`);

        res.json({
            success: true,
            message: "Simple cache cleared successfully"
        });
    } catch (error) {
        logger.error("Error clearing simple cache:", error);
        res.status(500).json({
            success: false,
            error: "Failed to clear simple cache"
        });
    }
});

export default router;
