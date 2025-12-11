"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceTimingMiddleware = exports.staticDataCache = exports.contentTypeOptimization = exports.responseSizeMonitor = exports.brotliMiddleware = exports.responseOptimizationMiddleware = exports.compressionMiddleware = void 0;
const compression_1 = __importDefault(require("compression"));
const logger_1 = require("../utils/logger");
// Compression configuration for different content types
const compressionConfig = {
    // Compression level (1-9, 9 is best compression but slowest)
    level: parseInt(process.env.COMPRESSION_LEVEL || "6", 10),
    // Minimum size to compress (bytes)
    threshold: parseInt(process.env.COMPRESSION_THRESHOLD || "1024", 10),
    // Memory level (1-9, 9 uses most memory but is fastest)
    memLevel: parseInt(process.env.COMPRESSION_MEM_LEVEL || "8", 10),
    // Window size (8-15, larger = better compression but more memory)
    windowBits: parseInt(process.env.COMPRESSION_WINDOW_BITS || "15", 10),
    // Compression strategy (use zlib constant directly)
    strategy: 0, // Z_DEFAULT_STRATEGY
    // Custom filter function for what to compress
    filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (!req.headers["accept-encoding"]) {
            return false;
        }
        // Don't compress images, videos, or already compressed files
        const contentType = res.getHeader("content-type");
        if (contentType) {
            const type = contentType.toLowerCase();
            if (type.includes("image/") ||
                type.includes("video/") ||
                type.includes("audio/") ||
                type.includes("application/zip") ||
                type.includes("application/gzip") ||
                type.includes("application/x-rar")) {
                return false;
            }
        }
        // Don't compress small responses
        const contentLength = res.getHeader("content-length");
        if (contentLength && parseInt(contentLength, 10) < compressionConfig.threshold) {
            return false;
        }
        // Compress text-based content
        return compression_1.default.filter(req, res);
    }
};
// Create compression middleware
exports.compressionMiddleware = (0, compression_1.default)(compressionConfig);
/**
 * Response optimization middleware
 */
const responseOptimizationMiddleware = (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    // Optimize JSON responses
    res.json = function (obj) {
        // Remove undefined values and null values if configured
        if (process.env.REMOVE_NULL_VALUES === "true") {
            obj = removeNullValues(obj);
        }
        // Add performance headers
        addPerformanceHeaders(this, req);
        return originalJson.call(this, obj);
    };
    // Optimize send responses
    res.send = function (body) {
        // Add performance headers
        addPerformanceHeaders(this, req);
        return originalSend.call(this, body);
    };
    next();
};
exports.responseOptimizationMiddleware = responseOptimizationMiddleware;
/**
 * Remove null and undefined values from objects to reduce payload size
 */
function removeNullValues(obj) {
    if (obj === null || obj === undefined) {
        return undefined;
    }
    if (Array.isArray(obj)) {
        return obj.map(removeNullValues).filter((item) => item !== undefined);
    }
    if (typeof obj === "object") {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleanedValue = removeNullValues(value);
            if (cleanedValue !== undefined) {
                cleaned[key] = cleanedValue;
            }
        }
        return cleaned;
    }
    return obj;
}
/**
 * Add performance-related headers
 */
function addPerformanceHeaders(res, req) {
    // Add cache control headers for static content
    if (req.originalUrl.includes("/api/v1/categories") || req.originalUrl.includes("/api/v1/brands")) {
        res.setHeader("Cache-Control", "public, max-age=300"); // 5 minutes
    }
    // Add ETag for caching
    if (!res.getHeader("etag")) {
        res.setHeader("ETag", `"${Date.now()}"`);
    }
    // Add compression info header in development
    if (process.env.NODE_ENV === "development") {
        const acceptEncoding = req.headers["accept-encoding"];
        if (acceptEncoding) {
            res.setHeader("X-Compression-Support", acceptEncoding);
        }
    }
}
/**
 * Brotli compression middleware (better than gzip for text)
 */
const brotliMiddleware = (req, res, next) => {
    const acceptEncoding = req.headers["accept-encoding"] || "";
    // Check if client supports Brotli
    if (acceptEncoding.includes("br")) {
        // Set Brotli as preferred encoding
        req.headers["accept-encoding"] = "br, " + acceptEncoding;
    }
    next();
};
exports.brotliMiddleware = brotliMiddleware;
/**
 * Response size monitoring middleware
 */
const responseSizeMonitor = (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    res.send = function (body) {
        logResponseSize(req, body, "send");
        return originalSend.call(this, body);
    };
    res.json = function (obj) {
        logResponseSize(req, obj, "json");
        return originalJson.call(this, obj);
    };
    next();
};
exports.responseSizeMonitor = responseSizeMonitor;
function logResponseSize(req, body, type) {
    if (process.env.NODE_ENV === "development") {
        let size = 0;
        if (typeof body === "string") {
            size = Buffer.byteLength(body, "utf8");
        }
        else if (body) {
            size = Buffer.byteLength(JSON.stringify(body), "utf8");
        }
        if (size > 10240) {
            // Log responses larger than 10KB
            logger_1.logger.debug(`📦 Large response: ${req.method} ${req.originalUrl} - ${(size / 1024).toFixed(2)}KB (${type})`);
        }
    }
}
/**
 * Content-Type optimization middleware
 */
const contentTypeOptimization = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (obj) {
        // Set optimized content type for JSON
        this.setHeader("Content-Type", "application/json; charset=utf-8");
        // Add JSON optimization headers
        if (process.env.NODE_ENV === "production") {
            this.setHeader("X-Content-Type-Options", "nosniff");
        }
        return originalJson.call(this, obj);
    };
    next();
};
exports.contentTypeOptimization = contentTypeOptimization;
/**
 * Response caching middleware for static data
 */
const staticDataCache = (ttl = 300) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== "GET") {
            return next();
        }
        // Set cache headers
        res.setHeader("Cache-Control", `public, max-age=${ttl}`);
        res.setHeader("Expires", new Date(Date.now() + ttl * 1000).toUTCString());
        // Handle conditional requests
        const ifNoneMatch = req.headers["if-none-match"];
        const etag = res.getHeader("etag");
        if (ifNoneMatch && etag && ifNoneMatch === etag) {
            return res.status(304).end();
        }
        next();
    };
};
exports.staticDataCache = staticDataCache;
/**
 * Middleware to add performance timing headers
 */
const performanceTimingMiddleware = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    // Override res.end to capture timing before headers are sent
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        // Set performance header before ending response
        if (process.env.NODE_ENV === "development" && !res.headersSent) {
            try {
                res.setHeader("X-Response-Time", `${duration.toFixed(2)}ms`);
            }
            catch (error) {
                // Ignore header errors
            }
        }
        // Log slow responses
        if (duration > 1000) {
            logger_1.logger.warn(`🐌 Slow response: ${req.method} ${req.originalUrl} took ${duration.toFixed(2)}ms`);
        }
        // Log performance metrics
        if (process.env.NODE_ENV === "development") {
            logger_1.logger.debug(`⚡ ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);
        }
        // Call original end method
        return originalEnd.call(this, chunk, encoding);
    };
    next();
};
exports.performanceTimingMiddleware = performanceTimingMiddleware;
