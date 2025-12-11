"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./config/config");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const indexes_1 = require("./config/indexes");
const optimizedStack_1 = require("./middleware/optimizedStack");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = require("./utils/logger");
const cacheService_1 = require("./services/cacheService");
const performance_1 = require("./utils/performance");
const i18n_1 = require("./middleware/i18n");
class OptimizedApp {
    app;
    middlewareStack;
    constructor() {
        this.app = (0, express_1.default)();
        this.middlewareStack = new optimizedStack_1.OptimizedMiddlewareStack(this.app, {
            enableCompression: true,
            enableRateLimit: true,
            enableCors: true,
            enableHelmet: true,
            enablePerformanceMonitoring: true,
            corsOrigins: config_1.config.cors.origin
        });
        this.initializeOptimizedMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeOptimizedMiddlewares() {
        // Apply optimized middleware stack
        this.middlewareStack.applyMiddleware();
        // Static files with caching
        this.app.use("/uploads", express_1.default.static("uploads", {
            maxAge: "1d", // Cache static files for 1 day
            etag: true,
            lastModified: true
        }));
    }
    initializeRoutes() {
        // Add i18n middleware for API routes
        this.app.use("/api", ...i18n_1.apiI18nMiddleware);
        // Health check
        this.app.get("/health", (req, res) => {
            res.status(200).json({
                status: "OK",
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
        // API routes
        this.app.use("/api/v1", routes_1.default);
    }
    initializeErrorHandling() {
        this.app.use(notFoundHandler_1.notFoundHandler);
        this.app.use(errorHandler_1.errorHandler);
    }
    async start() {
        try {
            logger_1.logger.info("🚀 Starting optimized ShopDev server...");
            // 1. Connect to database
            logger_1.logger.info("📊 Connecting to database...");
            await (0, database_1.connectDatabase)();
            // 2. Connect to Redis cache (optional)
            logger_1.logger.info("🔗 Connecting to Redis cache...");
            try {
                await redis_1.redisCache.connect();
                logger_1.logger.info("✅ Redis connected successfully");
            }
            catch (error) {
                logger_1.logger.warn("⚠️ Redis connection failed, continuing without cache:", error);
            }
            // 3. Create optimized database indexes (optional)
            if (config_1.config.nodeEnv === "development") {
                logger_1.logger.info("🔍 Creating optimized database indexes...");
                try {
                    await (0, indexes_1.createOptimizedIndexes)();
                    logger_1.logger.info("✅ Database indexes created successfully");
                }
                catch (error) {
                    logger_1.logger.warn("⚠️ Failed to create indexes, continuing:", error);
                }
            }
            // 4. Warm up cache with frequently accessed data
            logger_1.logger.info("🔥 Warming up cache...");
            await cacheService_1.cacheService.warmUp([
            // Add your warm-up functions here when you have data
            ]);
            // 5. Start server
            const port = config_1.config.port;
            this.app.listen(port, () => {
                logger_1.logger.info(`🚀 Optimized server running on port ${port}`);
                logger_1.logger.info(`📊 Environment: ${config_1.config.nodeEnv}`);
                logger_1.logger.info(`🔗 Database: ${config_1.config.database.type}`);
                logger_1.logger.info(`⚡ Redis caching enabled`);
                logger_1.logger.info(`🗜️ Compression enabled`);
                logger_1.logger.info(`🔒 Security headers enabled`);
                logger_1.logger.info(`📈 Performance monitoring enabled`);
            });
            // 6. Log performance stats periodically in development
            if (config_1.config.nodeEnv === "development") {
                setInterval(() => {
                    const stats = this.getStats();
                    logger_1.logger.debug("📈 Server Performance Stats:", stats);
                }, 5 * 60 * 1000); // Every 5 minutes
            }
            logger_1.logger.info("✅ Optimized server started successfully!");
        }
        catch (error) {
            logger_1.logger.error("❌ Failed to start optimized server:", error);
            process.exit(1);
        }
    }
    getStats() {
        return {
            middleware: this.middlewareStack.getStats(),
            performance: performance_1.performanceMonitor.getMetrics(),
            cache: cacheService_1.cacheService.getStats(),
            memory: cacheService_1.cacheService.getMemoryStats()
        };
    }
}
// Graceful shutdown
process.on("SIGTERM", async () => {
    logger_1.logger.info("SIGTERM received. Shutting down gracefully...");
    await redis_1.redisCache.disconnect();
    process.exit(0);
});
process.on("SIGINT", async () => {
    logger_1.logger.info("SIGINT received. Shutting down gracefully...");
    await redis_1.redisCache.disconnect();
    process.exit(0);
});
// Start the optimized application
const app = new OptimizedApp();
app.start().catch((error) => {
    logger_1.logger.error("Application startup failed:", error);
    process.exit(1);
});
