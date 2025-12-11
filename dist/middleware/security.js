"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestSizeLimiter = exports.validateApiKey = exports.corsSecurityCheck = exports.securityLogger = exports.ipWhitelist = exports.sanitizeRequest = exports.securityHeaders = void 0;
const helmet_1 = __importDefault(require("helmet"));
const logger_1 = require("../utils/logger");
/**
 * Comprehensive security middleware
 */
// Security headers middleware
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});
// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
    // Remove potentially dangerous characters from request body
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    // Remove dangerous characters from query parameters
    if (req.query && typeof req.query === 'object') {
        sanitizeObject(req.query);
    }
    next();
};
exports.sanitizeRequest = sanitizeRequest;
function sanitizeObject(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'string') {
                // Remove script tags, SQL injection patterns, etc.
                obj[key] = obj[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .replace(/(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)\b)/gi, '');
            }
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    }
}
// IP whitelist middleware for admin endpoints
const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
            logger_1.logger.warn(`Unauthorized IP access attempt: ${clientIP} to ${req.originalUrl}`);
            return res.status(403).json({
                success: false,
                error: "Access denied from this IP address"
            });
        }
        next();
    };
};
exports.ipWhitelist = ipWhitelist;
// Request logging for security monitoring
const securityLogger = (req, res, next) => {
    const startTime = Date.now();
    // Log suspicious patterns
    const suspiciousPatterns = [
        /\.\.\//g, // Directory traversal
        /<script/gi, // XSS attempts
        /union.*select/gi, // SQL injection
        /exec\(/gi, // Code execution
        /eval\(/gi, // Code evaluation
    ];
    const requestData = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params
    });
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestData));
    if (isSuspicious) {
        logger_1.logger.warn('Suspicious request detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            method: req.method,
            body: req.body,
            query: req.query
        });
    }
    // Log response time for performance monitoring
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (duration > 1000) { // Log slow requests
            logger_1.logger.warn(`Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`);
        }
    });
    next();
};
exports.securityLogger = securityLogger;
// CORS security enhancement
const corsSecurityCheck = (req, res, next) => {
    const origin = req.get('Origin');
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    // Check for suspicious origins
    if (origin && !allowedOrigins.includes(origin)) {
        logger_1.logger.warn(`Suspicious CORS request from origin: ${origin}`);
    }
    next();
};
exports.corsSecurityCheck = corsSecurityCheck;
// API key validation for internal services
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
            success: false,
            error: "Invalid or missing API key"
        });
    }
    next();
};
exports.validateApiKey = validateApiKey;
// Request size limiter
const requestSizeLimiter = (maxSize = 10 * 1024 * 1024) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');
        if (contentLength > maxSize) {
            return res.status(413).json({
                success: false,
                error: "Request entity too large"
            });
        }
        next();
    };
};
exports.requestSizeLimiter = requestSizeLimiter;
