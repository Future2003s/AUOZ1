import { performance } from "perf_hooks";
import { logger } from "./logger";
import { simpleCacheService } from "../services/simpleCacheService";
import { dataLoaderService } from "../services/dataLoaderService";
import { fastJsonService } from "../services/fastJsonService";
import { Product } from "../models/Product";
import { User } from "../models/User";

/**
 * Performance Benchmark Tool
 * Comprehensive performance testing and optimization analysis
 */
class BenchmarkService {
    private results: Map<string, any> = new Map();

    /**
     * Benchmark database queries
     */
    async benchmarkDatabase(): Promise<any> {
        logger.info("🔍 Starting database benchmark...");

        const results = {
            singleQuery: await this.benchmarkSingleQuery(),
            batchQuery: await this.benchmarkBatchQuery(),
            aggregation: await this.benchmarkAggregation(),
            indexedQuery: await this.benchmarkIndexedQuery()
        };

        this.results.set("database", results);
        logger.info("✅ Database benchmark completed");
        return results;
    }

    /**
     * Benchmark cache performance
     */
    async benchmarkCache(): Promise<any> {
        logger.info("🔍 Starting cache benchmark...");

        const results = {
            redis: await this.benchmarkRedisCache(),
            multiLayer: await this.benchmarkMultiLayerCache(),
            dataLoader: await this.benchmarkDataLoader()
        };

        this.results.set("cache", results);
        logger.info("✅ Cache benchmark completed");
        return results;
    }

    /**
     * Benchmark JSON serialization
     */
    async benchmarkJson(): Promise<any> {
        logger.info("🔍 Starting JSON benchmark...");

        const testData = {
            products: await Product.find().limit(100).lean(),
            users: await User.find().limit(50).lean()
        };

        const results = {
            fastJson: this.benchmarkFastJson(testData),
            regularJson: this.benchmarkRegularJson(testData),
            comparison: this.compareJsonPerformance(testData)
        };

        this.results.set("json", results);
        logger.info("✅ JSON benchmark completed");
        return results;
    }

    /**
     * Benchmark API endpoints
     */
    async benchmarkApi(): Promise<any> {
        logger.info("🔍 Starting API benchmark...");

        const results = {
            productList: await this.benchmarkEndpoint("/api/v1/products"),
            productDetail: await this.benchmarkEndpoint("/api/v1/products/"),
            userProfile: await this.benchmarkEndpoint("/api/v1/users/profile"),
            translations: await this.benchmarkEndpoint("/api/v1/translations/all?lang=vi")
        };

        this.results.set("api", results);
        logger.info("✅ API benchmark completed");
        return results;
    }

    /**
     * Run comprehensive benchmark
     */
    async runFullBenchmark(): Promise<any> {
        const startTime = performance.now();

        logger.info("🚀 Starting comprehensive performance benchmark...");

        const results = {
            timestamp: new Date().toISOString(),
            system: this.getSystemInfo(),
            database: await this.benchmarkDatabase(),
            cache: await this.benchmarkCache(),
            json: await this.benchmarkJson(),
            // api: await this.benchmarkApi(), // Commented out as it requires server to be running
            summary: {}
        };

        const totalTime = performance.now() - startTime;
        results.summary = this.generateSummary(results, totalTime);

        this.results.set("full", results);
        logger.info(`🎉 Full benchmark completed in ${totalTime.toFixed(2)}ms`);

        return results;
    }

    /**
     * Benchmark single database query
     */
    private async benchmarkSingleQuery(): Promise<any> {
        const iterations = 100;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await Product.findOne({ isVisible: true }).lean();
            const end = performance.now();
            times.push(end - start);
        }

        return this.calculateStats(times, "Single Query");
    }

    /**
     * Benchmark batch database query
     */
    private async benchmarkBatchQuery(): Promise<any> {
        const iterations = 50;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await Product.find({ isVisible: true }).limit(20).lean();
            const end = performance.now();
            times.push(end - start);
        }

        return this.calculateStats(times, "Batch Query (20 items)");
    }

    /**
     * Benchmark aggregation query
     */
    private async benchmarkAggregation(): Promise<any> {
        const iterations = 20;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await Product.aggregate([
                { $match: { isVisible: true } },
                { $group: { _id: "$category", count: { $sum: 1 }, avgPrice: { $avg: "$price" } } },
                { $sort: { count: -1 } }
            ]);
            const end = performance.now();
            times.push(end - start);
        }

        return this.calculateStats(times, "Aggregation Query");
    }

    /**
     * Benchmark indexed query
     */
    private async benchmarkIndexedQuery(): Promise<any> {
        const iterations = 100;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await Product.find({ category: { $exists: true } })
                .limit(10)
                .lean();
            const end = performance.now();
            times.push(end - start);
        }

        return this.calculateStats(times, "Indexed Query");
    }

    /**
     * Benchmark Redis cache
     */
    private async benchmarkRedisCache(): Promise<any> {
        const iterations = 200;
        const setTimes: number[] = [];
        const getTimes: number[] = [];

        // Benchmark SET operations
        for (let i = 0; i < iterations; i++) {
            const key = `benchmark:${i}`;
            const value = { id: i, data: `test data ${i}` };

            const start = performance.now();
            await simpleCacheService.set(key, value);
            const end = performance.now();
            setTimes.push(end - start);
        }

        // Benchmark GET operations
        for (let i = 0; i < iterations; i++) {
            const key = `benchmark:${i}`;

            const start = performance.now();
            await simpleCacheService.get(key);
            const end = performance.now();
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
    private async benchmarkMultiLayerCache(): Promise<any> {
        const iterations = 200;
        const times: number[] = [];

        // Pre-populate cache
        for (let i = 0; i < 50; i++) {
            await simpleCacheService.set(`multi:${i}`, { id: i, data: `data ${i}` });
        }

        // Benchmark cache hits
        for (let i = 0; i < iterations; i++) {
            const key = `multi:${i % 50}`;

            const start = performance.now();
            await simpleCacheService.get(key);
            const end = performance.now();
            times.push(end - start);
        }

        return this.calculateStats(times, "Multi-layer Cache");
    }

    /**
     * Benchmark DataLoader
     */
    private async benchmarkDataLoader(): Promise<any> {
        const products = await Product.find().limit(100).select("_id").lean();
        const productIds = products.map((p) => p._id.toString());

        const iterations = 50;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await dataLoaderService.loadProducts(productIds.slice(0, 20));
            const end = performance.now();
            times.push(end - start);
        }

        return this.calculateStats(times, "DataLoader (20 products)");
    }

    /**
     * Benchmark Fast JSON
     */
    private benchmarkFastJson(data: any): any {
        const iterations = 1000;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fastJsonService.stringify("productList", { data: data.products });
            const end = performance.now();
            times.push(end - start);
        }

        return this.calculateStats(times, "Fast JSON Stringify");
    }

    /**
     * Benchmark regular JSON
     */
    private benchmarkRegularJson(data: any): any {
        const iterations = 1000;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            JSON.stringify({ data: data.products });
            const end = performance.now();
            times.push(end - start);
        }

        return this.calculateStats(times, "Regular JSON Stringify");
    }

    /**
     * Compare JSON performance
     */
    private compareJsonPerformance(data: any): any {
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
    private async benchmarkEndpoint(endpoint: string): Promise<any> {
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
    private calculateStats(times: number[], operation: string): any {
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
    private getSystemInfo(): any {
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
    private generateSummary(results: any, totalTime: number): any {
        return {
            totalBenchmarkTime: `${totalTime.toFixed(2)}ms`,
            recommendations: this.generateRecommendations(results),
            performance: {
                database:
                    results.database?.singleQuery?.average < 10
                        ? "excellent"
                        : results.database?.singleQuery?.average < 50
                          ? "good"
                          : "needs improvement",
                cache:
                    results.cache?.multiLayer?.average < 5
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
    private generateRecommendations(results: any): string[] {
        const recommendations: string[] = [];

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
    getAllResults(): Map<string, any> {
        return this.results;
    }

    /**
     * Clear benchmark results
     */
    clearResults(): void {
        this.results.clear();
        logger.info("Benchmark results cleared");
    }
}

export const benchmarkService = new BenchmarkService();
