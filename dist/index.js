"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Chat module integrated — i18n translation routes added
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config/config");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const indexes_1 = require("./config/indexes");
const optimizedStack_1 = require("./middleware/optimizedStack");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
const routes_1 = __importDefault(require("./routes"));
const products_crud_1 = __importDefault(require("./routes/products-crud"));
const logger_1 = require("./utils/logger");
const cacheService_1 = require("./services/cacheService");
const performance_1 = require("./utils/performance");
const i18n_1 = require("./middleware/i18n");
const socket_1 = require("./config/socket");
const lanShareRoutes_1 = require("./modules/lanShare/lanShareRoutes");
class OptimizedApp {
    app;
    httpServer;
    middlewareStack;
    constructor() {
        this.app = (0, express_1.default)();
        this.httpServer = (0, http_1.createServer)(this.app);
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
        // Products Management UI
        this.app.get("/products-management", (req, res) => {
            const productsManagementPath = path_1.default.join(__dirname, "../views/products-management.html");
            if (fs_1.default.existsSync(productsManagementPath)) {
                const html = fs_1.default.readFileSync(productsManagementPath, "utf8");
                return res.type("html").send(html);
            }
            res.status(404).send("Products management page not found");
        });
        // Products CRUD routes at /products (dedicated route for product management)
        this.app.use("/products", products_crud_1.default);
        // LAN Share API (simple LAN file sharing)
        this.app.use("/api/lan", lanShareRoutes_1.lanShareRouter);
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
            // 5. Initialize Socket.IO
            logger_1.logger.info("🔌 Initializing Socket.IO server...");
            const ioInstance = (0, socket_1.initializeSocketIO)(this.httpServer);
            this.app.set("io", ioInstance);
            logger_1.logger.info("✅ Socket.IO server initialized");
            // 6. Start server
            const port = config_1.config.port;
            this.httpServer.listen(port, "0.0.0.0", () => {
                logger_1.logger.info(`🚀 Optimized server running on 0.0.0.0:${port}`);
                logger_1.logger.info(`📊 Environment: ${config_1.config.nodeEnv}`);
                logger_1.logger.info(`🔗 Database: ${config_1.config.database.type}`);
                logger_1.logger.info(`⚡ Redis caching enabled`);
                logger_1.logger.info(`🗜️ Compression enabled`);
                logger_1.logger.info(`🔒 Security headers enabled`);
                logger_1.logger.info(`📈 Performance monitoring enabled`);
                logger_1.logger.info(`🔌 Socket.IO enabled`);
                logger_1.logger.info(`📁 LAN Share upload dir: ${lanShareRoutes_1.lanUploadDir}`);
                logger_1.logger.info(`🌐 LAN Share base URL (configure from LAN IP): http://<your-lan-ip>:${port}/api/lan`);
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
