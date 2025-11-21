import { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { compressionMiddleware, responseOptimizationMiddleware, performanceTimingMiddleware } from "./compression";
import { performanceMiddleware } from "../utils/performance";
import { generalRateLimit } from "./rateLimiting";
import { logger } from "../utils/logger";

/**
 * Optimized middleware stack for maximum performance
 * Order matters for performance - most frequently used middleware should be first
 */

interface MiddlewareConfig {
    enableCompression?: boolean;
    enableRateLimit?: boolean;
    enableCors?: boolean;
    enableHelmet?: boolean;
    enablePerformanceMonitoring?: boolean;
    corsOrigins?: string[];
    rateLimitConfig?: any;
}

export class OptimizedMiddlewareStack {
    private app: Application;
    private config: MiddlewareConfig;

    constructor(app: Application, config: MiddlewareConfig = {}) {
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
    applyMiddleware(): void {
        logger.info("🔧 Applying optimized middleware stack...");

        // 1. Performance monitoring (should be first to capture all requests)
        if (this.config.enablePerformanceMonitoring) {
            this.app.use(performanceTimingMiddleware);
            this.app.use(performanceMiddleware);
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
            this.app.use(generalRateLimit);
        }

        // 5. Compression (before body parsing)
        if (this.config.enableCompression) {
            this.app.use(compressionMiddleware);
        }

        // 6. Response optimization
        this.app.use(responseOptimizationMiddleware);

        // 7. Request parsing middleware (optimized order)
        this.applyParsingMiddleware();

        // 8. Custom middleware for API optimization
        this.applyCustomMiddleware();

        logger.info("✅ Optimized middleware stack applied");
    }

    /**
     * Create optimized Helmet configuration
     */
    private createHelmetConfig() {
        return helmet({
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
    private createCorsConfig() {
        return cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, etc.)
                if (!origin) return callback(null, true);

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
    private applyParsingMiddleware(): void {
        // JSON parsing with optimized settings and proper UTF-8 encoding
        this.app.use(
            express.json({
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
                                logger.debug('Vietnamese characters detected in request body');
                            }
                        } catch (error) {
                            logger.warn('Invalid UTF-8 encoding in request body');
                        }
                    }
                }
            })
        );

        // URL-encoded parsing (minimal for API)
        this.app.use(
            express.urlencoded({
                extended: false, // Use querystring library (faster)
                limit: "1mb",
                parameterLimit: 100 // Prevent parameter pollution
            })
        );

        // Raw body parsing for webhooks (if needed)
        this.app.use(
            "/webhooks",
            express.raw({
                type: "application/json",
                limit: "1mb"
            })
        );
    }

    /**
     * Apply custom optimization middleware
     */
    private applyCustomMiddleware(): void {
        // Request ID for tracing
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            req.id = (req.headers["x-request-id"] as string) || Math.random().toString(36).substring(2, 15);
            res.setHeader("X-Request-ID", req.id);
            next();
        });

        // API version header
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            res.setHeader("X-API-Version", process.env.API_VERSION || "1.0.0");
            next();
        });

        // Ensure proper UTF-8 encoding for Vietnamese characters
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            // Set charset for JSON responses
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            next();
        });

        // Response time header (if not already set)
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            if (!res.getHeader("X-Response-Time")) {
                const start = Date.now();

                // Override res.end to set header before response is sent
                const originalEnd = res.end;
                res.end = function (chunk?: any, encoding?: any) {
                    const duration = Date.now() - start;
                    if (!res.headersSent) {
                        try {
                            res.setHeader("X-Response-Time", `${duration}ms`);
                        } catch (error) {
                            // Ignore header errors
                        }
                    }
                    return originalEnd.call(this, chunk, encoding);
                };
            }
            next();
        });

        // Health check bypass (skip heavy middleware)
        this.app.use("/health", (req: Request, res: Response, next: NextFunction) => {
            res.status(200).json({
                status: "healthy",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.env.API_VERSION || "1.0.0"
            });
        });

        // API documentation route
        this.app.use("/api/v1/health", (req: Request, res: Response) => {
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
    applyErrorHandling(): void {
        // 404 handler
        this.app.use("*", (req: Request, res: Response) => {
            res.status(404).json({
                success: false,
                error: "Route not found",
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler
        this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
            logger.error("Global error handler:", error);

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
    getStats(): any {
        return {
            middlewareCount: this.app._router?.stack?.length || 0,
            config: this.config,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Express extensions for better TypeScript support
 */
declare global {
    namespace Express {
        interface Request {
            id: string;
            startTime?: number;
        }
    }
}

// Import express for middleware
import express from "express";
