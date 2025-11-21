import express from "express";
import { config } from "./config/config";
import { connectDatabase } from "./config/database";
import { redisCache } from "./config/redis";
import { createOptimizedIndexes } from "./config/indexes";
import { OptimizedMiddlewareStack } from "./middleware/optimizedStack";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";
import routes from "./routes";
import { logger } from "./utils/logger";
import { cacheService } from "./services/cacheService";
import { performanceMonitor } from "./utils/performance";
import { apiI18nMiddleware } from "./middleware/i18n";

class OptimizedApp {
    public app: express.Application;
    private middlewareStack: OptimizedMiddlewareStack;

    constructor() {
        this.app = express();
        this.middlewareStack = new OptimizedMiddlewareStack(this.app, {
            enableCompression: true,
            enableRateLimit: true,
            enableCors: true,
            enableHelmet: true,
            enablePerformanceMonitoring: true,
            corsOrigins: config.cors.origin as string[]
        });

        this.initializeOptimizedMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    private initializeOptimizedMiddlewares(): void {
        // Apply optimized middleware stack
        this.middlewareStack.applyMiddleware();

        // Static files with caching
        this.app.use(
            "/uploads",
            express.static("uploads", {
                maxAge: "1d", // Cache static files for 1 day
                etag: true,
                lastModified: true
            })
        );
    }

    private initializeRoutes(): void {
        // Add i18n middleware for API routes
        this.app.use("/api", ...apiI18nMiddleware);

        // Health check
        this.app.get("/health", (req, res) => {
            res.status(200).json({
                status: "OK",
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // API routes
        this.app.use("/api/v1", routes);
    }

    private initializeErrorHandling(): void {
        this.app.use(notFoundHandler);
        this.app.use(errorHandler);
    }

    public async start(): Promise<void> {
        try {
            logger.info("🚀 Starting optimized ShopDev server...");

            // 1. Connect to database
            logger.info("📊 Connecting to database...");
            await connectDatabase();

            // 2. Connect to Redis cache (optional)
            logger.info("🔗 Connecting to Redis cache...");
            try {
                await redisCache.connect();
                logger.info("✅ Redis connected successfully");
            } catch (error) {
                logger.warn("⚠️ Redis connection failed, continuing without cache:", error);
            }

            // 3. Create optimized database indexes (optional)
            if (config.nodeEnv === "development") {
                logger.info("🔍 Creating optimized database indexes...");
                try {
                    await createOptimizedIndexes();
                    logger.info("✅ Database indexes created successfully");
                } catch (error) {
                    logger.warn("⚠️ Failed to create indexes, continuing:", error);
                }
            }

            // 4. Warm up cache with frequently accessed data
            logger.info("🔥 Warming up cache...");
            await cacheService.warmUp([
                // Add your warm-up functions here when you have data
            ]);

            // 5. Start server
            const port = config.port;
            this.app.listen(port, () => {
                logger.info(`🚀 Optimized server running on port ${port}`);
                logger.info(`📊 Environment: ${config.nodeEnv}`);
                logger.info(`🔗 Database: ${config.database.type}`);
                logger.info(`⚡ Redis caching enabled`);
                logger.info(`🗜️ Compression enabled`);
                logger.info(`🔒 Security headers enabled`);
                logger.info(`📈 Performance monitoring enabled`);
            });

            // 6. Log performance stats periodically in development
            if (config.nodeEnv === "development") {
                setInterval(
                    () => {
                        const stats = this.getStats();
                        logger.debug("📈 Server Performance Stats:", stats);
                    },
                    5 * 60 * 1000
                ); // Every 5 minutes
            }

            logger.info("✅ Optimized server started successfully!");
        } catch (error) {
            logger.error("❌ Failed to start optimized server:", error);
            process.exit(1);
        }
    }

    public getStats(): any {
        return {
            middleware: this.middlewareStack.getStats(),
            performance: performanceMonitor.getMetrics(),
            cache: cacheService.getStats(),
            memory: cacheService.getMemoryStats()
        };
    }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
    logger.info("SIGTERM received. Shutting down gracefully...");
    await redisCache.disconnect();
    process.exit(0);
});

process.on("SIGINT", async () => {
    logger.info("SIGINT received. Shutting down gracefully...");
    await redisCache.disconnect();
    process.exit(0);
});

// Start the optimized application
const app = new OptimizedApp();
app.start().catch((error) => {
    logger.error("Application startup failed:", error);
    process.exit(1);
});
