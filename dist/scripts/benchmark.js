"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceBenchmark = void 0;
exports.runAllBenchmarks = runAllBenchmarks;
const perf_hooks_1 = require("perf_hooks");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const Product_1 = require("../models/Product");
const User_1 = require("../models/User");
const Category_1 = require("../models/Category");
const logger_1 = require("../utils/logger");
const cacheService_1 = require("../services/cacheService");
class PerformanceBenchmark {
    results = [];
    /**
     * Run a benchmark test
     */
    async benchmark(operation, testFunction, iterations = 100) {
        logger_1.logger.info(`🏃 Running benchmark: ${operation} (${iterations} iterations)`);
        // Warm up
        for (let i = 0; i < Math.min(10, iterations); i++) {
            await testFunction();
        }
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        const startMemory = process.memoryUsage();
        const startTime = perf_hooks_1.performance.now();
        // Run the actual benchmark
        for (let i = 0; i < iterations; i++) {
            await testFunction();
        }
        const endTime = perf_hooks_1.performance.now();
        const endMemory = process.memoryUsage();
        const totalTime = endTime - startTime;
        const averageTime = totalTime / iterations;
        const opsPerSecond = 1000 / averageTime;
        const result = {
            operation,
            iterations,
            totalTime,
            averageTime,
            opsPerSecond,
            memoryUsage: {
                rss: endMemory.rss - startMemory.rss,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                external: endMemory.external - startMemory.external,
                arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
            }
        };
        this.results.push(result);
        this.logResult(result);
        return result;
    }
    /**
     * Database query benchmarks
     */
    async benchmarkDatabaseQueries() {
        logger_1.logger.info('📊 Starting database query benchmarks...');
        // Product queries
        await this.benchmark('Product.find() - No Index', async () => {
            await Product_1.Product.find({ name: { $regex: 'test', $options: 'i' } }).limit(10);
        }, 50);
        await this.benchmark('Product.find() - With Index', async () => {
            await Product_1.Product.find({ status: 'active' }).limit(10);
        }, 50);
        await this.benchmark('Product.findById()', async () => {
            const products = await Product_1.Product.find().limit(1);
            if (products.length > 0) {
                await Product_1.Product.findById(products[0]._id);
            }
        }, 100);
        await this.benchmark('Product.aggregate()', async () => {
            await Product_1.Product.aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $limit: 10 }
            ]);
        }, 30);
        // User queries
        await this.benchmark('User.findOne() - Email Index', async () => {
            await User_1.User.findOne({ email: 'test@example.com' });
        }, 100);
        // Category queries
        await this.benchmark('Category.find() - Hierarchy', async () => {
            await Category_1.Category.find({ parent: null }).populate('children');
        }, 50);
    }
    /**
     * Cache performance benchmarks
     */
    async benchmarkCacheOperations() {
        logger_1.logger.info('🔥 Starting cache operation benchmarks...');
        const testData = { id: 1, name: 'Test Product', price: 99.99 };
        const testKey = 'benchmark-test';
        // Redis cache operations
        await this.benchmark('Redis SET operation', async () => {
            await redis_1.redisCache.set(testKey, testData);
        }, 200);
        await this.benchmark('Redis GET operation', async () => {
            await redis_1.redisCache.get(testKey);
        }, 200);
        // Advanced cache service operations
        await this.benchmark('CacheService SET operation', async () => {
            await cacheService_1.cacheService.set('products', testKey, testData);
        }, 200);
        await this.benchmark('CacheService GET operation', async () => {
            await cacheService_1.cacheService.get('products', testKey);
        }, 200);
        // Memory vs Redis comparison
        const memoryCache = new Map();
        await this.benchmark('Memory Cache SET', async () => {
            memoryCache.set(testKey, testData);
        }, 1000);
        await this.benchmark('Memory Cache GET', async () => {
            memoryCache.get(testKey);
        }, 1000);
        // Cleanup
        await redis_1.redisCache.del(testKey);
        await cacheService_1.cacheService.delete('products', testKey);
    }
    /**
     * JSON serialization benchmarks
     */
    async benchmarkSerialization() {
        logger_1.logger.info('📦 Starting serialization benchmarks...');
        const smallObject = { id: 1, name: 'Test' };
        const largeObject = {
            id: 1,
            name: 'Large Test Object',
            description: 'A'.repeat(1000),
            data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: Math.random() }))
        };
        await this.benchmark('JSON.stringify - Small Object', async () => {
            JSON.stringify(smallObject);
        }, 1000);
        await this.benchmark('JSON.stringify - Large Object', async () => {
            JSON.stringify(largeObject);
        }, 500);
        const serializedSmall = JSON.stringify(smallObject);
        const serializedLarge = JSON.stringify(largeObject);
        await this.benchmark('JSON.parse - Small Object', async () => {
            JSON.parse(serializedSmall);
        }, 1000);
        await this.benchmark('JSON.parse - Large Object', async () => {
            JSON.parse(serializedLarge);
        }, 500);
    }
    /**
     * Async/await vs Promise benchmarks
     */
    async benchmarkAsyncPatterns() {
        logger_1.logger.info('⚡ Starting async pattern benchmarks...');
        const asyncFunction = async () => {
            return new Promise(resolve => setTimeout(resolve, 1));
        };
        await this.benchmark('Async/Await Pattern', async () => {
            await asyncFunction();
        }, 100);
        await this.benchmark('Promise.then Pattern', async () => {
            return asyncFunction().then(() => { });
        }, 100);
        await this.benchmark('Promise.all - Parallel', async () => {
            await Promise.all([
                asyncFunction(),
                asyncFunction(),
                asyncFunction()
            ]);
        }, 50);
        await this.benchmark('Sequential Await', async () => {
            await asyncFunction();
            await asyncFunction();
            await asyncFunction();
        }, 50);
    }
    /**
     * Log benchmark result
     */
    logResult(result) {
        logger_1.logger.info(`✅ ${result.operation}:`);
        logger_1.logger.info(`   Average: ${result.averageTime.toFixed(2)}ms`);
        logger_1.logger.info(`   Ops/sec: ${result.opsPerSecond.toFixed(0)}`);
        logger_1.logger.info(`   Memory: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
    /**
     * Generate benchmark report
     */
    generateReport() {
        logger_1.logger.info('\n📊 PERFORMANCE BENCHMARK REPORT');
        logger_1.logger.info('=====================================');
        const sortedResults = this.results.sort((a, b) => b.opsPerSecond - a.opsPerSecond);
        logger_1.logger.info('\n🏆 TOP PERFORMERS (Ops/Second):');
        sortedResults.slice(0, 5).forEach((result, index) => {
            logger_1.logger.info(`${index + 1}. ${result.operation}: ${result.opsPerSecond.toFixed(0)} ops/sec`);
        });
        logger_1.logger.info('\n🐌 SLOWEST OPERATIONS:');
        sortedResults.slice(-5).reverse().forEach((result, index) => {
            logger_1.logger.info(`${index + 1}. ${result.operation}: ${result.averageTime.toFixed(2)}ms avg`);
        });
        logger_1.logger.info('\n💾 MEMORY USAGE:');
        const memoryResults = this.results.sort((a, b) => b.memoryUsage.heapUsed - a.memoryUsage.heapUsed);
        memoryResults.slice(0, 5).forEach((result, index) => {
            const memoryMB = result.memoryUsage.heapUsed / 1024 / 1024;
            logger_1.logger.info(`${index + 1}. ${result.operation}: ${memoryMB.toFixed(2)}MB`);
        });
        logger_1.logger.info('\n📈 SUMMARY STATISTICS:');
        const totalOps = this.results.reduce((sum, r) => sum + r.iterations, 0);
        const totalTime = this.results.reduce((sum, r) => sum + r.totalTime, 0);
        const avgOpsPerSec = this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / this.results.length;
        logger_1.logger.info(`Total Operations: ${totalOps}`);
        logger_1.logger.info(`Total Time: ${totalTime.toFixed(2)}ms`);
        logger_1.logger.info(`Average Ops/Second: ${avgOpsPerSec.toFixed(0)}`);
        logger_1.logger.info(`Total Benchmarks: ${this.results.length}`);
    }
    /**
     * Clear results
     */
    clearResults() {
        this.results = [];
    }
}
exports.PerformanceBenchmark = PerformanceBenchmark;
/**
 * Run all benchmarks
 */
async function runAllBenchmarks() {
    try {
        logger_1.logger.info('🚀 Starting Performance Benchmarks...');
        // Connect to database and cache
        await (0, database_1.connectDatabase)();
        await redis_1.redisCache.connect();
        const benchmark = new PerformanceBenchmark();
        // Run all benchmark suites
        await benchmark.benchmarkDatabaseQueries();
        await benchmark.benchmarkCacheOperations();
        await benchmark.benchmarkSerialization();
        await benchmark.benchmarkAsyncPatterns();
        // Generate final report
        benchmark.generateReport();
        logger_1.logger.info('✅ All benchmarks completed!');
    }
    catch (error) {
        logger_1.logger.error('❌ Benchmark failed:', error);
    }
    finally {
        await redis_1.redisCache.disconnect();
        process.exit(0);
    }
}
// Run benchmarks if this file is executed directly
if (require.main === module) {
    runAllBenchmarks();
}
