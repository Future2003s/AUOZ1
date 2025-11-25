import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { redisCache } from "../config/redis";
import { logger } from "../utils/logger";

/**
 * High-performance rate limiting with Redis backend
 */

interface RateLimitConfig {
    windowMs: number;
    max: number;
    message?: string;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (req: Request) => string;
}

const clientIpKey = (req: Request): string => {
    const forwarded = (req.headers["x-forwarded-for"] as string | undefined)
        ?.split(",")
        .map((ip) => ip.trim())
        .find(Boolean);

    return (
        forwarded ||
        req.ip ||
        (req.connection as any)?.remoteAddress ||
        req.socket?.remoteAddress ||
        "unknown"
    );
};

/**
 * Redis-based rate limit store for better performance and persistence
 */
class RedisRateLimitStore {
    private prefix: string;
    private windowMs: number;

    constructor(prefix: string = "rate_limit", windowMs: number = 60000) {
        this.prefix = prefix;
        this.windowMs = windowMs;
    }

    async increment(key: string): Promise<{ totalHits: number; timeToExpire: number }> {
        try {
            if (!redisCache.isReady()) {
                // Fallback to allowing the request if Redis is not available
                return { totalHits: 1, timeToExpire: this.windowMs };
            }

            const client = redisCache.getClient();
            const fullKey = `${this.prefix}:${key}`;

            // Use Redis multi for atomic operations
            const multi = client.multi();
            multi.incr(fullKey);
            multi.expire(fullKey, Math.ceil(this.windowMs / 1000));
            multi.ttl(fullKey);

            const results = await multi.exec();

            if (!results || results.length < 3) {
                throw new Error("Redis multi failed");
            }

            const totalHits = Number(results[0]) || 0;
            const ttl = Number(results[2]) || 0;
            const timeToExpire = ttl > 0 ? ttl * 1000 : this.windowMs;

            return { totalHits, timeToExpire };
        } catch (error) {
            logger.error("Redis rate limit error:", error);
            // Fallback to allowing the request if Redis fails
            return { totalHits: 1, timeToExpire: this.windowMs };
        }
    }

    async decrement(key: string): Promise<void> {
        try {
            const client = redisCache.getClient();
            const fullKey = `${this.prefix}:${key}`;
            await client.decr(fullKey);
        } catch (error) {
            logger.error("Redis rate limit decrement error:", error);
        }
    }

    async resetKey(key: string): Promise<void> {
        try {
            const client = redisCache.getClient();
            const fullKey = `${this.prefix}:${key}`;
            await client.del(fullKey);
        } catch (error) {
            logger.error("Redis rate limit reset error:", error);
        }
    }
}

/**
 * Create optimized rate limiter
 */
function createRateLimiter(config: RateLimitConfig) {
    const store = new RedisRateLimitStore("rate_limit", config.windowMs);

    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message || {
            error: "Too many requests",
            retryAfter: Math.ceil(config.windowMs / 1000)
        },
        standardHeaders: config.standardHeaders !== false,
        legacyHeaders: config.legacyHeaders !== false,
        skipSuccessfulRequests: config.skipSuccessfulRequests || false,
        skipFailedRequests: config.skipFailedRequests || false,

        // Use recommended key generator to handle IPv4/IPv6 correctly
        keyGenerator: config.keyGenerator || ((req: Request) => clientIpKey(req)),

        // Custom store implementation
        store: {
            incr: async (key: string, cb: Function) => {
                try {
                    const result = await store.increment(key);
                    cb(null, result.totalHits, new Date(Date.now() + result.timeToExpire));
                } catch (error) {
                    cb(error);
                }
            },
            decrement: async (key: string) => {
                await store.decrement(key);
            },
            resetKey: async (key: string) => {
                await store.resetKey(key);
            }
        },

        // Custom handler for rate limit exceeded
        handler: (req: Request, res: Response) => {
            const retryAfter = Math.ceil(config.windowMs / 1000);

            logger.warn(`Rate limit exceeded for ${clientIpKey(req)} on ${req.originalUrl}`);

            res.status(429).json({
                success: false,
                error: "Too many requests",
                message: config.message || "Please try again later",
                retryAfter,
                limit: config.max,
                windowMs: config.windowMs
            });
        },

        // Skip certain requests
        skip: (req: Request) => {
            // Skip rate limiting for health checks
            if (req.originalUrl === "/health" || req.originalUrl === "/api/v1/health") {
                return true;
            }

            // Skip for internal requests (if you have internal API keys)
            const apiKey = req.headers["x-internal-api-key"];
            if (apiKey === process.env.INTERNAL_API_KEY) {
                return true;
            }

            return false;
        }
    });
}

/**
 * Different rate limiters for different endpoints
 */

// General API rate limiter
export const generalRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: "Too many requests from this IP, please try again later"
});

// Authentication rate limiter (stricter with progressive delays)
export const authRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Reduced to 5 failed attempts per 15 minutes
    message: "Too many authentication attempts, please try again later",
    skipSuccessfulRequests: true, // Don't count successful logins
    keyGenerator: (req: Request) => {
        // Rate limit by IP + email combination for more precise limiting
        const email = (req.body?.email || "unknown").toLowerCase().trim();
        return `${clientIpKey(req)}:${email}`;
    }
});

// Stricter rate limiter for failed login attempts
export const failedLoginRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Only 3 failed attempts per hour per IP+email
    message: "Account temporarily locked due to multiple failed login attempts",
    skipSuccessfulRequests: true,
    keyGenerator: (req: Request) => {
        const email = req.body?.email || "unknown";
        return `failed:${clientIpKey(req)}:${email}`;
    }
});

// Search rate limiter
export const searchRateLimit = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: "Too many search requests, please slow down"
});

// Cart operations rate limiter
export const cartRateLimit = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 cart operations per minute
    message: "Too many cart operations, please slow down"
});

// Review submission rate limiter
export const reviewRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 reviews per hour
    message: "Too many review submissions, please try again later"
});

// Comment rate limiter
export const commentRateLimit = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 comment operations per minute
    message: "Too many comment operations, please slow down"
});

// Admin operations rate limiter
export const adminRateLimit = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 admin operations per minute
    message: "Too many admin operations, please slow down"
});

/**
 * Dynamic rate limiter based on user role
 */
export const dynamicRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
        // Apply general rate limit for unauthenticated users
        return generalRateLimit(req, res, next);
    }

    // Different limits based on user role
    let limiter;
    switch (user.role) {
        case "admin":
            limiter = adminRateLimit;
            break;
        case "premium":
            // Premium users get higher limits
            limiter = createRateLimiter({
                windowMs: 15 * 60 * 1000,
                max: 2000, // Double the normal limit
                message: "Rate limit exceeded for premium user"
            });
            break;
        default:
            limiter = generalRateLimit;
    }

    return limiter(req, res, next);
};

/**
 * Intelligent rate limiter that adjusts based on server load
 */
export const adaptiveRateLimit = (() => {
    let currentLoad = 0;

    // Monitor server load
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        currentLoad = (heapUsedMB / heapTotalMB) * 100;
    }, 10000); // Check every 10 seconds

    return (req: Request, res: Response, next: NextFunction) => {
        // Adjust rate limits based on server load
        let maxRequests = 1000;

        if (currentLoad > 80) {
            maxRequests = 200; // Severely limit when under high load
        } else if (currentLoad > 60) {
            maxRequests = 500; // Moderately limit when under medium load
        }

        const adaptiveLimiter = createRateLimiter({
            windowMs: 15 * 60 * 1000,
            max: maxRequests,
            message: `Server under load (${currentLoad.toFixed(1)}%), please try again later`
        });

        return adaptiveLimiter(req, res, next);
    };
})();

/**
 * Rate limit bypass for trusted IPs
 */
export const trustedIPBypass = (trustedIPs: string[] = []) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const clientIP = clientIpKey(req);

        if (clientIP && trustedIPs.includes(clientIP)) {
            return next(); // Skip rate limiting for trusted IPs
        }

        return generalRateLimit(req, res, next);
    };
};

/**
 * Rate limiting analytics
 */
export const rateLimitAnalytics = {
    async getStats(timeframe: "hour" | "day" | "week" = "hour"): Promise<any> {
        try {
            const client = redisCache.getClient();
            const pattern = "rate_limit:*";
            const keys = await client.keys(pattern);

            const stats = {
                totalKeys: keys.length,
                timeframe,
                timestamp: new Date()
            };

            return stats;
        } catch (error) {
            logger.error("Rate limit analytics error:", error);
            return null;
        }
    },

    async clearAllLimits(): Promise<boolean> {
        try {
            const client = redisCache.getClient();
            const pattern = "rate_limit:*";
            const keys = await client.keys(pattern);

            if (keys.length > 0) {
                await client.del(keys);
            }

            logger.info(`Cleared ${keys.length} rate limit entries`);
            return true;
        } catch (error) {
            logger.error("Clear rate limits error:", error);
            return false;
        }
    }
};
