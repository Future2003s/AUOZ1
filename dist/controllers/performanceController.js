"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPerformanceData = exports.getPerformanceRecommendations = exports.optimizeDatabase = exports.testJsonPerformance = exports.getMonitoringDashboard = exports.getSystemHealth = exports.clearCaches = exports.getCacheStats = exports.runBenchmark = exports.getPerformanceMetrics = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const performance_1 = require("../utils/performance");
const cacheService_1 = require("../services/cacheService");
const apiResponse_1 = require("../utils/apiResponse");
const benchmark_1 = require("../utils/benchmark");
const simpleCacheService_1 = require("../services/simpleCacheService");
const dataLoaderService_1 = require("../services/dataLoaderService");
const fastJsonService_1 = require("../services/fastJsonService");
const monitoring_1 = require("../utils/monitoring");
/**
 * Performance Controller
 * Advanced performance monitoring and optimization tools
 */
/**
 * Get comprehensive performance metrics
 */
exports.getPerformanceMetrics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const metrics = {
        system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        },
        performance: performance_1.performanceMonitor.getMetrics(),
        cache: {
            redis: cacheService_1.cacheService.getStats(),
            simple: simpleCacheService_1.simpleCacheService.getStats(),
            dataLoader: dataLoaderService_1.dataLoaderService.getStats()
        },
        monitoring: await monitoring_1.monitoringService.getSystemHealth(),
        timestamp: new Date().toISOString()
    };
    res.json(new apiResponse_1.ApiResponse(true, "Performance metrics retrieved successfully", metrics));
});
/**
 * Run performance benchmark
 */
exports.runBenchmark = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type = "full" } = req.query;
    let results;
    switch (type) {
        case "database":
            results = await benchmark_1.benchmarkService.benchmarkDatabase();
            break;
        case "cache":
            results = await benchmark_1.benchmarkService.benchmarkCache();
            break;
        case "json":
            results = await benchmark_1.benchmarkService.benchmarkJson();
            break;
        case "api":
            results = await benchmark_1.benchmarkService.benchmarkApi();
            break;
        default:
            results = await benchmark_1.benchmarkService.runFullBenchmark();
    }
    res.json(new apiResponse_1.ApiResponse(true, `${type} benchmark completed successfully`, results));
});
/**
 * Get cache statistics
 */
exports.getCacheStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const stats = {
        redis: cacheService_1.cacheService.getStats(),
        simple: simpleCacheService_1.simpleCacheService.getStats(),
        dataLoader: dataLoaderService_1.dataLoaderService.getStats(),
        health: simpleCacheService_1.simpleCacheService.getHealth(),
        recommendations: []
    };
    // Add recommendations based on stats
    const hitRate = parseFloat(stats.simple.hitRate);
    if (hitRate < 70) {
        stats.recommendations.push("Consider increasing cache TTL or reviewing cache strategies");
    }
    if (stats.simple.nodeSize >= stats.simple.nodeMaxSize * 0.9) {
        stats.recommendations.push("Node cache is near capacity, consider increasing size");
    }
    res.json(new apiResponse_1.ApiResponse(true, "Cache statistics retrieved successfully", stats));
});
/**
 * Clear all caches
 */
exports.clearCaches = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type = "all" } = req.body;
    const results = {
        cleared: [],
        errors: []
    };
    try {
        if (type === "all" || type === "redis") {
            await cacheService_1.cacheService.invalidatePattern("*", "*");
            results.cleared.push("Redis cache");
        }
        if (type === "all" || type === "advanced") {
            // await advancedCacheService.clear();
            // results.cleared.push("Advanced cache");
        }
        if (type === "all" || type === "dataloader") {
            dataLoaderService_1.dataLoaderService.clearAll();
            results.cleared.push("DataLoader cache");
        }
        res.json(new apiResponse_1.ApiResponse(true, "Caches cleared successfully", results));
    }
    catch (error) {
        results.errors.push(error.message || "Unknown error");
        res.status(500).json(new apiResponse_1.ApiResponse(false, "Error clearing caches", results));
    }
});
/**
 * Get system health
 */
exports.getSystemHealth = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const health = await monitoring_1.monitoringService.getSystemHealth();
    const statusCode = health.status === "healthy" ? 200 : health.status === "warning" ? 200 : 503;
    res.status(statusCode).json(new apiResponse_1.ApiResponse(true, "System health retrieved successfully", health));
});
/**
 * Get monitoring dashboard data
 */
exports.getMonitoringDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const dashboard = await monitoring_1.monitoringService.getDashboardData();
    res.json(new apiResponse_1.ApiResponse(true, "Monitoring dashboard data retrieved successfully", dashboard));
});
/**
 * Test JSON performance
 */
exports.testJsonPerformance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
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
    const results = fastJsonService_1.fastJsonService.benchmark("productList", testData, Number(iterations));
    res.json(new apiResponse_1.ApiResponse(true, "JSON performance test completed", results));
});
/**
 * Optimize database queries
 */
exports.optimizeDatabase = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const optimizations = {
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
    ];
    res.json(new apiResponse_1.ApiResponse(true, "Database optimization analysis completed", optimizations));
});
/**
 * Get performance recommendations
 */
exports.getPerformanceRecommendations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const metrics = performance_1.performanceMonitor.getMetrics();
    const cacheStats = simpleCacheService_1.simpleCacheService.getStats();
    const health = await monitoring_1.monitoringService.getSystemHealth();
    const recommendations = [];
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
    if (metrics.errorRate > 5) {
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
    res.json(new apiResponse_1.ApiResponse(true, "Performance recommendations generated", {
        recommendations,
        summary: {
            total: recommendations.length,
            critical: recommendations.filter((r) => r.type === "critical").length,
            high: recommendations.filter((r) => r.type === "high").length,
            medium: recommendations.filter((r) => r.type === "medium").length,
            info: recommendations.filter((r) => r.type === "info").length
        },
        timestamp: new Date().toISOString()
    }));
});
/**
 * Export performance data
 */
exports.exportPerformanceData = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { format = "json", timeframe = "24h" } = req.query;
    const data = {
        metrics: performance_1.performanceMonitor.getMetrics(),
        cache: simpleCacheService_1.simpleCacheService.getStats(),
        health: await monitoring_1.monitoringService.getSystemHealth(),
        benchmarks: benchmark_1.benchmarkService.getAllResults(),
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
            `Error Rate,${data.metrics.errorRate || 0},%`,
            `Cache Hit Rate,${data.metrics.cacheHitRate},%`,
            `Memory Usage,${Math.round(data.system.memory.heapUsed / 1024 / 1024)},MB`,
            `Uptime,${Math.round(data.system.uptime)},seconds`
        ].join("\n");
        res.send(csv);
    }
    else {
        res.json(new apiResponse_1.ApiResponse(true, "Performance data exported successfully", data));
    }
});
