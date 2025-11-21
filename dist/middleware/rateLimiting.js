"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitAnalytics = exports.trustedIPBypass = exports.adaptiveRateLimit = exports.dynamicRateLimit = exports.adminRateLimit = exports.reviewRateLimit = exports.cartRateLimit = exports.searchRateLimit = exports.failedLoginRateLimit = exports.authRateLimit = exports.generalRateLimit = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
/**
 * Redis-based rate limit store for better performance and persistence
 */
class RedisRateLimitStore {
    prefix;
    windowMs;
    constructor(prefix = "rate_limit", windowMs = 60000) {
        this.prefix = prefix;
        this.windowMs = windowMs;
    }
    async increment(key) {
        try {
            if (!redis_1.redisCache.isReady()) {
                // Fallback to allowing the request if Redis is not available
                return { totalHits: 1, timeToExpire: this.windowMs };
            }
            const client = redis_1.redisCache.getClient();
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
        }
        catch (error) {
            logger_1.logger.error("Redis rate limit error:", error);
            // Fallback to allowing the request if Redis fails
            return { totalHits: 1, timeToExpire: this.windowMs };
        }
    }
    async decrement(key) {
        try {
            const client = redis_1.redisCache.getClient();
            const fullKey = `${this.prefix}:${key}`;
            await client.decr(fullKey);
        }
        catch (error) {
            logger_1.logger.error("Redis rate limit decrement error:", error);
        }
    }
    async resetKey(key) {
        try {
            const client = redis_1.redisCache.getClient();
            const fullKey = `${this.prefix}:${key}`;
            await client.del(fullKey);
        }
        catch (error) {
            logger_1.logger.error("Redis rate limit reset error:", error);
        }
    }
}
/**
 * Create optimized rate limiter
 */
function createRateLimiter(config) {
    const store = new RedisRateLimitStore("rate_limit", config.windowMs);
    return (0, express_rate_limit_1.default)({
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
        keyGenerator: config.keyGenerator || ((req) => req.ip || "unknown"),
        // Custom store implementation
        store: {
            incr: async (key, cb) => {
                try {
                    const result = await store.increment(key);
                    cb(null, result.totalHits, new Date(Date.now() + result.timeToExpire));
                }
                catch (error) {
                    cb(error);
                }
            },
            decrement: async (key) => {
                await store.decrement(key);
            },
            resetKey: async (key) => {
                await store.resetKey(key);
            }
        },
        // Custom handler for rate limit exceeded
        handler: (req, res) => {
            const retryAfter = Math.ceil(config.windowMs / 1000);
            logger_1.logger.warn(`Rate limit exceeded for ${req.ip} on ${req.originalUrl}`);
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
        skip: (req) => {
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
exports.generalRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: "Too many requests from this IP, please try again later"
});
// Authentication rate limiter (stricter with progressive delays)
exports.authRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Reduced to 5 failed attempts per 15 minutes
    message: "Too many authentication attempts, please try again later",
    skipSuccessfulRequests: true, // Don't count successful logins
    keyGenerator: (req) => {
        // Rate limit by IP + email combination for more precise limiting
        const email = (req.body?.email || "unknown").toLowerCase().trim();
        return `${(0, express_rate_limit_1.ipKeyGenerator)(req.ip || "unknown")}:${email}`;
    }
});
// Stricter rate limiter for failed login attempts
exports.failedLoginRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Only 3 failed attempts per hour per IP+email
    message: "Account temporarily locked due to multiple failed login attempts",
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        const email = req.body?.email || "unknown";
        return `failed:${(0, express_rate_limit_1.ipKeyGenerator)(req.ip || "unknown")}:${email}`;
    }
});
// Search rate limiter
exports.searchRateLimit = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: "Too many search requests, please slow down"
});
// Cart operations rate limiter
exports.cartRateLimit = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 cart operations per minute
    message: "Too many cart operations, please slow down"
});
// Review submission rate limiter
exports.reviewRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 reviews per hour
    message: "Too many review submissions, please try again later"
});
// Admin operations rate limiter
exports.adminRateLimit = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 admin operations per minute
    message: "Too many admin operations, please slow down"
});
/**
 * Dynamic rate limiter based on user role
 */
const dynamicRateLimit = (req, res, next) => {
    const user = req.user;
    if (!user) {
        // Apply general rate limit for unauthenticated users
        return (0, exports.generalRateLimit)(req, res, next);
    }
    // Different limits based on user role
    let limiter;
    switch (user.role) {
        case "admin":
            limiter = exports.adminRateLimit;
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
            limiter = exports.generalRateLimit;
    }
    return limiter(req, res, next);
};
exports.dynamicRateLimit = dynamicRateLimit;
/**
 * Intelligent rate limiter that adjusts based on server load
 */
exports.adaptiveRateLimit = (() => {
    let currentLoad = 0;
    // Monitor server load
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        currentLoad = (heapUsedMB / heapTotalMB) * 100;
    }, 10000); // Check every 10 seconds
    return (req, res, next) => {
        // Adjust rate limits based on server load
        let maxRequests = 1000;
        if (currentLoad > 80) {
            maxRequests = 200; // Severely limit when under high load
        }
        else if (currentLoad > 60) {
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
const trustedIPBypass = (trustedIPs = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        if (clientIP && trustedIPs.includes(clientIP)) {
            return next(); // Skip rate limiting for trusted IPs
        }
        return (0, exports.generalRateLimit)(req, res, next);
    };
};
exports.trustedIPBypass = trustedIPBypass;
/**
 * Rate limiting analytics
 */
exports.rateLimitAnalytics = {
    async getStats(timeframe = "hour") {
        try {
            const client = redis_1.redisCache.getClient();
            const pattern = "rate_limit:*";
            const keys = await client.keys(pattern);
            const stats = {
                totalKeys: keys.length,
                timeframe,
                timestamp: new Date()
            };
            return stats;
        }
        catch (error) {
            logger_1.logger.error("Rate limit analytics error:", error);
            return null;
        }
    },
    async clearAllLimits() {
        try {
            const client = redis_1.redisCache.getClient();
            const pattern = "rate_limit:*";
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
            }
            logger_1.logger.info(`Cleared ${keys.length} rate limit entries`);
            return true;
        }
        catch (error) {
            logger_1.logger.error("Clear rate limits error:", error);
            return false;
        }
    }
};
