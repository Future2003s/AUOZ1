import { performance } from 'perf_hooks';
import { connectDatabase } from '../config/database';
import { redisCache } from '../config/redis';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { logger } from '../utils/logger';
import { cacheService } from '../services/cacheService';

/**
 * Performance benchmark script to measure optimization improvements
 */

interface BenchmarkResult {
    operation: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    opsPerSecond: number;
    memoryUsage: NodeJS.MemoryUsage;
}

class PerformanceBenchmark {
    private results: BenchmarkResult[] = [];

    /**
     * Run a benchmark test
     */
    async benchmark(
        operation: string,
        testFunction: () => Promise<any>,
        iterations: number = 100
    ): Promise<BenchmarkResult> {
        logger.info(`🏃 Running benchmark: ${operation} (${iterations} iterations)`);

        // Warm up
        for (let i = 0; i < Math.min(10, iterations); i++) {
            await testFunction();
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        const startMemory = process.memoryUsage();
        const startTime = performance.now();

        // Run the actual benchmark
        for (let i = 0; i < iterations; i++) {
            await testFunction();
        }

        const endTime = performance.now();
        const endMemory = process.memoryUsage();

        const totalTime = endTime - startTime;
        const averageTime = totalTime / iterations;
        const opsPerSecond = 1000 / averageTime;

        const result: BenchmarkResult = {
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
    async benchmarkDatabaseQueries(): Promise<void> {
        logger.info('📊 Starting database query benchmarks...');

        // Product queries
        await this.benchmark('Product.find() - No Index', async () => {
            await Product.find({ name: { $regex: 'test', $options: 'i' } }).limit(10);
        }, 50);

        await this.benchmark('Product.find() - With Index', async () => {
            await Product.find({ status: 'active' }).limit(10);
        }, 50);

        await this.benchmark('Product.findById()', async () => {
            const products = await Product.find().limit(1);
            if (products.length > 0) {
                await Product.findById(products[0]._id);
            }
        }, 100);

        await this.benchmark('Product.aggregate()', async () => {
            await Product.aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $limit: 10 }
            ]);
        }, 30);

        // User queries
        await this.benchmark('User.findOne() - Email Index', async () => {
            await User.findOne({ email: 'test@example.com' });
        }, 100);

        // Category queries
        await this.benchmark('Category.find() - Hierarchy', async () => {
            await Category.find({ parent: null }).populate('children');
        }, 50);
    }

    /**
     * Cache performance benchmarks
     */
    async benchmarkCacheOperations(): Promise<void> {
        logger.info('🔥 Starting cache operation benchmarks...');

        const testData = { id: 1, name: 'Test Product', price: 99.99 };
        const testKey = 'benchmark-test';

        // Redis cache operations
        await this.benchmark('Redis SET operation', async () => {
            await redisCache.set(testKey, testData);
        }, 200);

        await this.benchmark('Redis GET operation', async () => {
            await redisCache.get(testKey);
        }, 200);

        // Advanced cache service operations
        await this.benchmark('CacheService SET operation', async () => {
            await cacheService.set('products', testKey, testData);
        }, 200);

        await this.benchmark('CacheService GET operation', async () => {
            await cacheService.get('products', testKey);
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
        await redisCache.del(testKey);
        await cacheService.delete('products', testKey);
    }

    /**
     * JSON serialization benchmarks
     */
    async benchmarkSerialization(): Promise<void> {
        logger.info('📦 Starting serialization benchmarks...');

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
    async benchmarkAsyncPatterns(): Promise<void> {
        logger.info('⚡ Starting async pattern benchmarks...');

        const asyncFunction = async () => {
            return new Promise(resolve => setTimeout(resolve, 1));
        };

        await this.benchmark('Async/Await Pattern', async () => {
            await asyncFunction();
        }, 100);

        await this.benchmark('Promise.then Pattern', async () => {
            return asyncFunction().then(() => {});
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
    private logResult(result: BenchmarkResult): void {
        logger.info(`✅ ${result.operation}:`);
        logger.info(`   Average: ${result.averageTime.toFixed(2)}ms`);
        logger.info(`   Ops/sec: ${result.opsPerSecond.toFixed(0)}`);
        logger.info(`   Memory: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }

    /**
     * Generate benchmark report
     */
    generateReport(): void {
        logger.info('\n📊 PERFORMANCE BENCHMARK REPORT');
        logger.info('=====================================');

        const sortedResults = this.results.sort((a, b) => b.opsPerSecond - a.opsPerSecond);

        logger.info('\n🏆 TOP PERFORMERS (Ops/Second):');
        sortedResults.slice(0, 5).forEach((result, index) => {
            logger.info(`${index + 1}. ${result.operation}: ${result.opsPerSecond.toFixed(0)} ops/sec`);
        });

        logger.info('\n🐌 SLOWEST OPERATIONS:');
        sortedResults.slice(-5).reverse().forEach((result, index) => {
            logger.info(`${index + 1}. ${result.operation}: ${result.averageTime.toFixed(2)}ms avg`);
        });

        logger.info('\n💾 MEMORY USAGE:');
        const memoryResults = this.results.sort((a, b) => b.memoryUsage.heapUsed - a.memoryUsage.heapUsed);
        memoryResults.slice(0, 5).forEach((result, index) => {
            const memoryMB = result.memoryUsage.heapUsed / 1024 / 1024;
            logger.info(`${index + 1}. ${result.operation}: ${memoryMB.toFixed(2)}MB`);
        });

        logger.info('\n📈 SUMMARY STATISTICS:');
        const totalOps = this.results.reduce((sum, r) => sum + r.iterations, 0);
        const totalTime = this.results.reduce((sum, r) => sum + r.totalTime, 0);
        const avgOpsPerSec = this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / this.results.length;

        logger.info(`Total Operations: ${totalOps}`);
        logger.info(`Total Time: ${totalTime.toFixed(2)}ms`);
        logger.info(`Average Ops/Second: ${avgOpsPerSec.toFixed(0)}`);
        logger.info(`Total Benchmarks: ${this.results.length}`);
    }

    /**
     * Clear results
     */
    clearResults(): void {
        this.results = [];
    }
}

/**
 * Run all benchmarks
 */
async function runAllBenchmarks(): Promise<void> {
    try {
        logger.info('🚀 Starting Performance Benchmarks...');

        // Connect to database and cache
        await connectDatabase();
        await redisCache.connect();

        const benchmark = new PerformanceBenchmark();

        // Run all benchmark suites
        await benchmark.benchmarkDatabaseQueries();
        await benchmark.benchmarkCacheOperations();
        await benchmark.benchmarkSerialization();
        await benchmark.benchmarkAsyncPatterns();

        // Generate final report
        benchmark.generateReport();

        logger.info('✅ All benchmarks completed!');

    } catch (error) {
        logger.error('❌ Benchmark failed:', error);
    } finally {
        await redisCache.disconnect();
        process.exit(0);
    }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
    runAllBenchmarks();
}

export { PerformanceBenchmark, runAllBenchmarks };
