"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.benchmarkService = void 0;
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("./logger");
const simpleCacheService_1 = require("../services/simpleCacheService");
const dataLoaderService_1 = require("../services/dataLoaderService");
const fastJsonService_1 = require("../services/fastJsonService");
const Product_1 = require("../models/Product");
const User_1 = require("../models/User");
/**
 * Performance Benchmark Tool
 * Comprehensive performance testing and optimization analysis
 */
class BenchmarkService {
    results = new Map();
    /**
     * Benchmark database queries
     */
    async benchmarkDatabase() {
        logger_1.logger.info("🔍 Starting database benchmark...");
        const results = {
            singleQuery: await this.benchmarkSingleQuery(),
            batchQuery: await this.benchmarkBatchQuery(),
            aggregation: await this.benchmarkAggregation(),
            indexedQuery: await this.benchmarkIndexedQuery()
        };
        this.results.set("database", results);
        logger_1.logger.info("✅ Database benchmark completed");
        return results;
    }
    /**
     * Benchmark cache performance
     */
    async benchmarkCache() {
        logger_1.logger.info("🔍 Starting cache benchmark...");
        const results = {
            redis: await this.benchmarkRedisCache(),
            multiLayer: await this.benchmarkMultiLayerCache(),
            dataLoader: await this.benchmarkDataLoader()
        };
        this.results.set("cache", results);
        logger_1.logger.info("✅ Cache benchmark completed");
        return results;
    }
    /**
     * Benchmark JSON serialization
     */
    async benchmarkJson() {
        logger_1.logger.info("🔍 Starting JSON benchmark...");
        const testData = {
            products: await Product_1.Product.find().limit(100).lean(),
            users: await User_1.User.find().limit(50).lean()
        };
        const results = {
            fastJson: this.benchmarkFastJson(testData),
            regularJson: this.benchmarkRegularJson(testData),
            comparison: this.compareJsonPerformance(testData)
        };
        this.results.set("json", results);
        logger_1.logger.info("✅ JSON benchmark completed");
        return results;
    }
    /**
     * Benchmark API endpoints
     */
    async benchmarkApi() {
        logger_1.logger.info("🔍 Starting API benchmark...");
        const results = {
            productList: await this.benchmarkEndpoint("/api/v1/products"),
            productDetail: await this.benchmarkEndpoint("/api/v1/products/"),
            userProfile: await this.benchmarkEndpoint("/api/v1/users/profile"),
            translations: await this.benchmarkEndpoint("/api/v1/translations/all?lang=vi")
        };
        this.results.set("api", results);
        logger_1.logger.info("✅ API benchmark completed");
        return results;
    }
    /**
     * Run comprehensive benchmark
     */
    async runFullBenchmark() {
        const startTime = perf_hooks_1.performance.now();
        logger_1.logger.info("🚀 Starting comprehensive performance benchmark...");
        const results = {
            timestamp: new Date().toISOString(),
            system: this.getSystemInfo(),
            database: await this.benchmarkDatabase(),
            cache: await this.benchmarkCache(),
            json: await this.benchmarkJson(),
            // api: await this.benchmarkApi(), // Commented out as it requires server to be running
            summary: {}
        };
        const totalTime = perf_hooks_1.performance.now() - startTime;
        results.summary = this.generateSummary(results, totalTime);
        this.results.set("full", results);
        logger_1.logger.info(`🎉 Full benchmark completed in ${totalTime.toFixed(2)}ms`);
        return results;
    }
    /**
     * Benchmark single database query
     */
    async benchmarkSingleQuery() {
        const iterations = 100;
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = perf_hooks_1.performance.now();
            await Product_1.Product.findOne({ isVisible: true }).lean();
            const end = perf_hooks_1.performance.now();
            times.push(end - start);
        }
        return this.calculateStats(times, "Single Query");
    }
    /**
     * Benchmark batch database query
     */
    async benchmarkBatchQuery() {
        const iterations = 50;
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = perf_hooks_1.performance.now();
            await Product_1.Product.find({ isVisible: true }).limit(20).lean();
            const end = perf_hooks_1.performance.now();
            times.push(end - start);
        }
        return this.calculateStats(times, "Batch Query (20 items)");
    }
    /**
     * Benchmark aggregation query
     */
    async benchmarkAggregation() {
        const iterations = 20;
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = perf_hooks_1.performance.now();
            await Product_1.Product.aggregate([
                { $match: { isVisible: true } },
                { $group: { _id: "$category", count: { $sum: 1 }, avgPrice: { $avg: "$price" } } },
                { $sort: { count: -1 } }
            ]);
            const end = perf_hooks_1.performance.now();
            times.push(end - start);
        }
        return this.calculateStats(times, "Aggregation Query");
    }
    /**
     * Benchmark indexed query
     */
    async benchmarkIndexedQuery() {
        const iterations = 100;
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = perf_hooks_1.performance.now();
            await Product_1.Product.find({ category: { $exists: true } })
                .limit(10)
                .lean();
            const end = perf_hooks_1.performance.now();
            times.push(end - start);
        }
        return this.calculateStats(times, "Indexed Query");
    }
    /**
     * Benchmark Redis cache
     */
    async benchmarkRedisCache() {
        const iterations = 200;
        const setTimes = [];
        const getTimes = [];
        // Benchmark SET operations
        for (let i = 0; i < iterations; i++) {
            const key = `benchmark:${i}`;
            const value = { id: i, data: `test data ${i}` };
            const start = perf_hooks_1.performance.now();
            await simpleCacheService_1.simpleCacheService.set(key, value);
            const end = perf_hooks_1.performance.now();
            setTimes.push(end - start);
        }
        // Benchmark GET operations
        for (let i = 0; i < iterations; i++) {
            const key = `benchmark:${i}`;
            const start = perf_hooks_1.performance.now();
            await simpleCacheService_1.simpleCacheService.get(key);
            const end = perf_hooks_1.performance.now();
            getTimes.push(end - start);
        }
        return {
            set: this.calculateStats(setTimes, "Redis SET"),
            get: this.calculateStats(getTimes, "Redis GET")
        };
    }
    /**
     * Benchmark multi-layer cache
     */
    async benchmarkMultiLayerCache() {
        const iterations = 200;
        const times = [];
        // Pre-populate cache
        for (let i = 0; i < 50; i++) {
            await simpleCacheService_1.simpleCacheService.set(`multi:${i}`, { id: i, data: `data ${i}` });
        }
        // Benchmark cache hits
        for (let i = 0; i < iterations; i++) {
            const key = `multi:${i % 50}`;
            const start = perf_hooks_1.performance.now();
            await simpleCacheService_1.simpleCacheService.get(key);
            const end = perf_hooks_1.performance.now();
            times.push(end - start);
        }
        return this.calculateStats(times, "Multi-layer Cache");
    }
    /**
     * Benchmark DataLoader
     */
    async benchmarkDataLoader() {
        const products = await Product_1.Product.find().limit(100).select("_id").lean();
        const productIds = products.map((p) => p._id.toString());
        const iterations = 50;
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = perf_hooks_1.performance.now();
            await dataLoaderService_1.dataLoaderService.loadProducts(productIds.slice(0, 20));
            const end = perf_hooks_1.performance.now();
            times.push(end - start);
        }
        return this.calculateStats(times, "DataLoader (20 products)");
    }
    /**
     * Benchmark Fast JSON
     */
    benchmarkFastJson(data) {
        const iterations = 1000;
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = perf_hooks_1.performance.now();
            fastJsonService_1.fastJsonService.stringify("productList", { data: data.products });
            const end = perf_hooks_1.performance.now();
            times.push(end - start);
        }
        return this.calculateStats(times, "Fast JSON Stringify");
    }
    /**
     * Benchmark regular JSON
     */
    benchmarkRegularJson(data) {
        const iterations = 1000;
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = perf_hooks_1.performance.now();
            JSON.stringify({ data: data.products });
            const end = perf_hooks_1.performance.now();
            times.push(end - start);
        }
        return this.calculateStats(times, "Regular JSON Stringify");
    }
    /**
     * Compare JSON performance
     */
    compareJsonPerformance(data) {
        const fastResult = this.benchmarkFastJson(data);
        const regularResult = this.benchmarkRegularJson(data);
        const speedup = regularResult.average / fastResult.average;
        return {
            fastJson: fastResult,
            regularJson: regularResult,
            speedup: `${speedup.toFixed(2)}x faster`,
            improvement: `${((1 - fastResult.average / regularResult.average) * 100).toFixed(1)}% faster`
        };
    }
    /**
     * Benchmark API endpoint
     */
    async benchmarkEndpoint(endpoint) {
        // This would require making actual HTTP requests
        // For now, return placeholder data
        return {
            endpoint,
            note: "API benchmarking requires server to be running",
            placeholder: true
        };
    }
    /**
     * Calculate statistics from timing data
     */
    calculateStats(times, operation) {
        const sorted = times.sort((a, b) => a - b);
        const sum = times.reduce((a, b) => a + b, 0);
        return {
            operation,
            iterations: times.length,
            average: sum / times.length,
            median: sorted[Math.floor(sorted.length / 2)],
            min: Math.min(...times),
            max: Math.max(...times),
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            unit: "ms"
        };
    }
    /**
     * Get system information
     */
    getSystemInfo() {
        return {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage()
        };
    }
    /**
     * Generate benchmark summary
     */
    generateSummary(results, totalTime) {
        return {
            totalBenchmarkTime: `${totalTime.toFixed(2)}ms`,
            recommendations: this.generateRecommendations(results),
            performance: {
                database: results.database?.singleQuery?.average < 10
                    ? "excellent"
                    : results.database?.singleQuery?.average < 50
                        ? "good"
                        : "needs improvement",
                cache: results.cache?.multiLayer?.average < 5
                    ? "excellent"
                    : results.cache?.multiLayer?.average < 20
                        ? "good"
                        : "needs improvement",
                json: results.json?.comparison?.speedup || "N/A"
            }
        };
    }
    /**
     * Generate performance recommendations
     */
    generateRecommendations(results) {
        const recommendations = [];
        if (results.database?.singleQuery?.average > 50) {
            recommendations.push("Consider adding database indexes for frequently queried fields");
        }
        if (results.cache?.multiLayer?.average > 20) {
            recommendations.push("Optimize cache configuration or increase cache size");
        }
        if (results.database?.aggregation?.average > 100) {
            recommendations.push("Consider optimizing aggregation queries or using materialized views");
        }
        recommendations.push("Use DataLoader for batch operations to avoid N+1 queries");
        recommendations.push("Implement proper caching strategies for frequently accessed data");
        recommendations.push("Monitor and optimize slow database queries");
        return recommendations;
    }
    /**
     * Get all benchmark results
     */
    getAllResults() {
        return this.results;
    }
    /**
     * Clear benchmark results
     */
    clearResults() {
        this.results.clear();
        logger_1.logger.info("Benchmark results cleared");
    }
}
exports.benchmarkService = new BenchmarkService();
