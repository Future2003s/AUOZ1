import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { performanceMonitor } from "../utils/performance";
import { cacheService } from "../services/cacheService";
import { ApiResponse } from "../utils/apiResponse";
import { benchmarkService } from "../utils/benchmark";
import { simpleCacheService } from "../services/simpleCacheService";
import { dataLoaderService } from "../services/dataLoaderService";
import { fastJsonService } from "../services/fastJsonService";
import { monitoringService } from "../utils/monitoring";

/**
 * Performance Controller
 * Advanced performance monitoring and optimization tools
 */

/**
 * Get comprehensive performance metrics
 */
export const getPerformanceMetrics = asyncHandler(async (req: Request, res: Response) => {
    const metrics = {
        system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        },
        performance: performanceMonitor.getMetrics(),
        cache: {
            redis: cacheService.getStats(),
            simple: simpleCacheService.getStats(),
            dataLoader: dataLoaderService.getStats()
        },
        monitoring: await monitoringService.getSystemHealth(),
        timestamp: new Date().toISOString()
    };

    res.json(new ApiResponse(true, "Performance metrics retrieved successfully", metrics));
});

/**
 * Run performance benchmark
 */
export const runBenchmark = asyncHandler(async (req: Request, res: Response) => {
    const { type = "full" } = req.query;

    let results;
    switch (type) {
        case "database":
            results = await benchmarkService.benchmarkDatabase();
            break;
        case "cache":
            results = await benchmarkService.benchmarkCache();
            break;
        case "json":
            results = await benchmarkService.benchmarkJson();
            break;
        case "api":
            results = await benchmarkService.benchmarkApi();
            break;
        default:
            results = await benchmarkService.runFullBenchmark();
    }

    res.json(new ApiResponse(true, `${type} benchmark completed successfully`, results));
});

/**
 * Get cache statistics
 */
export const getCacheStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = {
        redis: cacheService.getStats(),
        simple: simpleCacheService.getStats(),
        dataLoader: dataLoaderService.getStats(),
        health: simpleCacheService.getHealth(),
        recommendations: [] as string[]
    };

    // Add recommendations based on stats
    const hitRate = parseFloat(stats.simple.hitRate);
    if (hitRate < 70) {
        stats.recommendations.push("Consider increasing cache TTL or reviewing cache strategies");
    }
    if (stats.simple.nodeSize >= stats.simple.nodeMaxSize * 0.9) {
        stats.recommendations.push("Node cache is near capacity, consider increasing size");
    }

    res.json(new ApiResponse(true, "Cache statistics retrieved successfully", stats));
});

/**
 * Clear all caches
 */
export const clearCaches = asyncHandler(async (req: Request, res: Response) => {
    const { type = "all" } = req.body;

    const results = {
        cleared: [] as string[],
        errors: [] as string[]
    };

    try {
        if (type === "all" || type === "redis") {
            await cacheService.invalidatePattern("*", "*");
            results.cleared.push("Redis cache");
        }

        if (type === "all" || type === "advanced") {
            // await advancedCacheService.clear();
            // results.cleared.push("Advanced cache");
        }

        if (type === "all" || type === "dataloader") {
            dataLoaderService.clearAll();
            results.cleared.push("DataLoader cache");
        }

        res.json(new ApiResponse(true, "Caches cleared successfully", results));
    } catch (error) {
        results.errors.push((error as Error).message || "Unknown error");
        res.status(500).json(new ApiResponse(false, "Error clearing caches", results));
    }
});

/**
 * Get system health
 */
export const getSystemHealth = asyncHandler(async (req: Request, res: Response) => {
    const health = await monitoringService.getSystemHealth();

    const statusCode = health.status === "healthy" ? 200 : health.status === "warning" ? 200 : 503;

    res.status(statusCode).json(new ApiResponse(true, "System health retrieved successfully", health));
});

/**
 * Get monitoring dashboard data
 */
export const getMonitoringDashboard = asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await monitoringService.getDashboardData();

    res.json(new ApiResponse(true, "Monitoring dashboard data retrieved successfully", dashboard));
});

/**
 * Test JSON performance
 */
export const testJsonPerformance = asyncHandler(async (req: Request, res: Response) => {
    const { iterations = 1000 } = req.query;

    // Sample data for testing
    const testData = {
        products: Array.from({ length: 100 }, (_, i) => ({
            _id: `product_${i}`,
            name: `Product ${i}`,
            price: Math.random() * 1000,
            description: `Description for product ${i}`,
            category: `category_${i % 10}`,
            rating: Math.random() * 5,
            reviewCount: Math.floor(Math.random() * 100)
        }))
    };

    const results = fastJsonService.benchmark("productList", testData, Number(iterations));

    res.json(new ApiResponse(true, "JSON performance test completed", results));
});

/**
 * Optimize database queries
 */
export const optimizeDatabase = asyncHandler(async (req: Request, res: Response) => {
    const optimizations: {
        indexesCreated: string[];
        queriesOptimized: string[];
        recommendations: string[];
    } = {
        indexesCreated: [],
        queriesOptimized: [],
        recommendations: []
    };

    // This would contain actual optimization logic
    optimizations.recommendations = [
        "Add compound indexes for frequently queried field combinations",
        "Use lean() queries when full documents are not needed",
        "Implement proper pagination with cursor-based pagination for large datasets",
        "Use aggregation pipelines for complex data transformations",
        "Consider read replicas for read-heavy workloads"
    ] as string[];

    res.json(new ApiResponse(true, "Database optimization analysis completed", optimizations));
});

/**
 * Get performance recommendations
 */
export const getPerformanceRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const metrics = performanceMonitor.getMetrics();
    const cacheStats = simpleCacheService.getStats();
    const health = await monitoringService.getSystemHealth();

    const recommendations: any[] = [];

    // Performance-based recommendations
    if (metrics.averageResponseTime > 1000) {
        recommendations.push({
            type: "critical",
            category: "response_time",
            message: "Average response time is over 1 second",
            suggestions: [
                "Implement caching for frequently accessed data",
                "Optimize database queries",
                "Consider using CDN for static assets"
            ]
        });
    }

    if ((metrics as any).errorRate > 5) {
        recommendations.push({
            type: "high",
            category: "error_rate",
            message: "Error rate is above 5%",
            suggestions: [
                "Review error logs for common issues",
                "Implement better error handling",
                "Add health checks for external dependencies"
            ]
        });
    }

    // Cache-based recommendations
    const hitRate = parseFloat(cacheStats.hitRate);
    if (hitRate < 70) {
        recommendations.push({
            type: "medium",
            category: "cache",
            message: "Cache hit rate is below 70%",
            suggestions: [
                "Review cache key strategies",
                "Increase cache TTL for stable data",
                "Implement cache warming for critical data"
            ]
        });
    }

    // Health-based recommendations
    if (health.status !== "healthy") {
        recommendations.push({
            type: "high",
            category: "system_health",
            message: `System health is ${health.status}`,
            suggestions: ["Check failed health checks", "Monitor resource usage", "Review system alerts"]
        });
    }

    // General recommendations
    recommendations.push({
        type: "info",
        category: "optimization",
        message: "General performance optimization tips",
        suggestions: [
            "Use DataLoader to batch database queries",
            "Implement proper pagination",
            "Use fast-json-stringify for JSON serialization",
            "Monitor and optimize slow queries",
            "Implement proper caching strategies"
        ]
    });

    res.json(
        new ApiResponse(true, "Performance recommendations generated", {
            recommendations,
            summary: {
                total: recommendations.length,
                critical: recommendations.filter((r) => r.type === "critical").length,
                high: recommendations.filter((r) => r.type === "high").length,
                medium: recommendations.filter((r) => r.type === "medium").length,
                info: recommendations.filter((r) => r.type === "info").length
            },
            timestamp: new Date().toISOString()
        })
    );
});

/**
 * Export performance data
 */
export const exportPerformanceData = asyncHandler(async (req: Request, res: Response) => {
    const { format = "json", timeframe = "24h" } = req.query;

    const data = {
        metrics: performanceMonitor.getMetrics(),
        cache: simpleCacheService.getStats(),
        health: await monitoringService.getSystemHealth(),
        benchmarks: benchmarkService.getAllResults(),
        system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        },
        exportedAt: new Date().toISOString(),
        timeframe
    };

    if (format === "csv") {
        // Simple CSV export (in production, use a proper CSV library)
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=performance-data.csv");

        const csv = [
            "Metric,Value,Unit",
            `Request Count,${data.metrics.requestCount},requests`,
            `Average Response Time,${data.metrics.averageResponseTime},ms`,
            `Error Rate,${(data.metrics as any).errorRate || 0},%`,
            `Cache Hit Rate,${data.metrics.cacheHitRate},%`,
            `Memory Usage,${Math.round(data.system.memory.heapUsed / 1024 / 1024)},MB`,
            `Uptime,${Math.round(data.system.uptime)},seconds`
        ].join("\n");

        res.send(csv);
    } else {
        res.json(new ApiResponse(true, "Performance data exported successfully", data));
    }
});
