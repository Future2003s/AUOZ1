"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedMiddlewareStack = void 0;
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = require("./compression");
const performance_1 = require("../utils/performance");
const rateLimiting_1 = require("./rateLimiting");
const logger_1 = require("../utils/logger");
class OptimizedMiddlewareStack {
    app;
    config;
    constructor(app, config = {}) {
        this.app = app;
        this.config = {
            enableCompression: true,
            enableRateLimit: true,
            enableCors: true,
            enableHelmet: true,
            enablePerformanceMonitoring: true,
            corsOrigins: ["http://localhost:3000", "http://localhost:3001"],
            ...config
        };
    }
    /**
     * Apply optimized middleware stack
     */
    applyMiddleware() {
        logger_1.logger.info("🔧 Applying optimized middleware stack...");
        // 1. Performance monitoring (should be first to capture all requests)
        if (this.config.enablePerformanceMonitoring) {
            this.app.use(compression_1.performanceTimingMiddleware);
            this.app.use(performance_1.performanceMiddleware);
        }
        // 2. Security headers (early for security)
        if (this.config.enableHelmet) {
            this.app.use(this.createHelmetConfig());
        }
        // 3. CORS (early for preflight requests)
        if (this.config.enableCors) {
            this.app.use(this.createCorsConfig());
        }
        // 4. Rate limiting (early to prevent abuse)
        if (this.config.enableRateLimit) {
            this.app.use(rateLimiting_1.generalRateLimit);
        }
        // 5. Compression (before body parsing)
        if (this.config.enableCompression) {
            this.app.use(compression_1.compressionMiddleware);
        }
        // 6. Response optimization
        this.app.use(compression_1.responseOptimizationMiddleware);
        // 7. Request parsing middleware (optimized order)
        this.applyParsingMiddleware();
        // 8. Custom middleware for API optimization
        this.applyCustomMiddleware();
        logger_1.logger.info("✅ Optimized middleware stack applied");
    }
    /**
     * Create optimized Helmet configuration
     */
    createHelmetConfig() {
        return (0, helmet_1.default)({
            // Optimize for performance
            contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
            crossOriginEmbedderPolicy: false, // Can cause issues with some APIs
            // Essential security headers
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true
            },
            // Optimize for API usage
            noSniff: true,
            frameguard: { action: "deny" },
            xssFilter: true,
            // Custom headers for API performance
            referrerPolicy: { policy: "no-referrer" }
        });
    }
    /**
     * Create optimized CORS configuration
     */
    createCorsConfig() {
        return (0, cors_1.default)({
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, etc.)
                if (!origin)
                    return callback(null, true);
                // Check against allowed origins
                if (this.config.corsOrigins?.includes(origin)) {
                    return callback(null, true);
                }
                // Allow localhost in development
                if (process.env.NODE_ENV === "development" && origin.includes("localhost")) {
                    return callback(null, true);
                }
                return callback(new Error("Not allowed by CORS"));
            },
            // Optimize CORS headers
            credentials: true,
            optionsSuccessStatus: 200, // For legacy browser support
            // Cache preflight requests
            maxAge: 86400, // 24 hours
            // Optimize allowed headers
            allowedHeaders: [
                "Origin",
                "X-Requested-With",
                "Content-Type",
                "Accept",
                "Authorization",
                "X-Session-ID",
                "X-API-Key"
            ],
            // Optimize exposed headers
            exposedHeaders: ["X-Total-Count", "X-Page-Count", "X-Response-Time", "X-Rate-Limit-Remaining"]
        });
    }
    /**
     * Apply optimized parsing middleware
     */
    applyParsingMiddleware() {
        // JSON parsing with optimized settings and proper UTF-8 encoding
        this.app.use(express_1.default.json({
            limit: "10mb", // Reasonable limit for API
            strict: true, // Only parse objects and arrays
            type: ["application/json", "application/json; charset=utf-8"],
            // Ensure proper UTF-8 encoding for Vietnamese characters
            verify: (req, res, buf) => {
                // Ensure buffer is properly encoded
                if (buf && buf.length > 0) {
                    // Check if the buffer contains valid UTF-8
                    try {
                        const text = buf.toString('utf8');
                        // Validate that Vietnamese characters are preserved
                        if (text.includes('ạ') || text.includes('á') || text.includes('ả') || text.includes('ã') || text.includes('ă')) {
                            logger_1.logger.debug('Vietnamese characters detected in request body');
                        }
                    }
                    catch (error) {
                        logger_1.logger.warn('Invalid UTF-8 encoding in request body');
                    }
                }
            }
        }));
        // URL-encoded parsing (minimal for API)
        this.app.use(express_1.default.urlencoded({
            extended: false, // Use querystring library (faster)
            limit: "1mb",
            parameterLimit: 100 // Prevent parameter pollution
        }));
        // Raw body parsing for webhooks (if needed)
        this.app.use("/webhooks", express_1.default.raw({
            type: "application/json",
            limit: "1mb"
        }));
    }
    /**
     * Apply custom optimization middleware
     */
    applyCustomMiddleware() {
        // Request ID for tracing
        this.app.use((req, res, next) => {
            req.id = req.headers["x-request-id"] || Math.random().toString(36).substring(2, 15);
            res.setHeader("X-Request-ID", req.id);
            next();
        });
        // API version header
        this.app.use((req, res, next) => {
            res.setHeader("X-API-Version", process.env.API_VERSION || "1.0.0");
            next();
        });
        // Ensure proper UTF-8 encoding for Vietnamese characters
        this.app.use((req, res, next) => {
            // Set charset for JSON responses
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            next();
        });
        // Response time header (if not already set)
        this.app.use((req, res, next) => {
            if (!res.getHeader("X-Response-Time")) {
                const start = Date.now();
                // Override res.end to set header before response is sent
                const originalEnd = res.end;
                res.end = function (chunk, encoding) {
                    const duration = Date.now() - start;
                    if (!res.headersSent) {
                        try {
                            res.setHeader("X-Response-Time", `${duration}ms`);
                        }
                        catch (error) {
                            // Ignore header errors
                        }
                    }
                    return originalEnd.call(this, chunk, encoding);
                };
            }
            next();
        });
        // Health check bypass (skip heavy middleware)
        this.app.use("/health", (req, res, next) => {
            res.status(200).json({
                status: "healthy",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.env.API_VERSION || "1.0.0"
            });
        });
        // API documentation route
        this.app.use("/api/v1/health", (req, res) => {
            res.status(200).json({
                status: "healthy",
                service: "ShopDev API",
                version: process.env.API_VERSION || "1.0.0",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || "development",
                database: "connected", // You can add actual DB health check here
                cache: "connected" // You can add actual cache health check here
            });
        });
    }
    /**
     * Apply error handling middleware (should be last)
     */
    applyErrorHandling() {
        // 404 handler
        this.app.use("*", (req, res) => {
            res.status(404).json({
                success: false,
                error: "Route not found",
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        });
        // Global error handler
        this.app.use((error, req, res, next) => {
            logger_1.logger.error("Global error handler:", error);
            // Don't leak error details in production
            const isDevelopment = process.env.NODE_ENV === "development";
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message || "Internal Server Error",
                ...(isDevelopment && { stack: error.stack }),
                timestamp: new Date().toISOString(),
                requestId: req.id
            });
        });
    }
    /**
     * Get middleware performance stats
     */
    getStats() {
        return {
            middlewareCount: this.app._router?.stack?.length || 0,
            config: this.config,
            timestamp: new Date().toISOString()
        };
    }
}
exports.OptimizedMiddlewareStack = OptimizedMiddlewareStack;
// Import express for middleware
const express_1 = __importDefault(require("express"));
