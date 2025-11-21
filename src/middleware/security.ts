import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { logger } from "../utils/logger";

/**
 * Comprehensive security middleware
 */

// Security headers middleware
export const securityHeaders = helmet({
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
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
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

function sanitizeObject(obj: any): void {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'string') {
                // Remove script tags, SQL injection patterns, etc.
                obj[key] = obj[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .replace(/(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)\b)/gi, '');
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    }
}

// IP whitelist middleware for admin endpoints
export const ipWhitelist = (allowedIPs: string[] = []) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        
        if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP as string)) {
            logger.warn(`Unauthorized IP access attempt: ${clientIP} to ${req.originalUrl}`);
            return res.status(403).json({
                success: false,
                error: "Access denied from this IP address"
            });
        }
        
        next();
    };
};

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
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
        logger.warn('Suspicious request detected', {
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
            logger.warn(`Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`);
        }
    });
    
    next();
};

// CORS security enhancement
export const corsSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('Origin');
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    
    // Check for suspicious origins
    if (origin && !allowedOrigins.includes(origin)) {
        logger.warn(`Suspicious CORS request from origin: ${origin}`);
    }
    
    next();
};

// API key validation for internal services
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    const validApiKey = process.env.INTERNAL_API_KEY;
    
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
            success: false,
            error: "Invalid or missing API key"
        });
    }
    
    next();
};

// Request size limiter
export const requestSizeLimiter = (maxSize: number = 10 * 1024 * 1024) => { // 10MB default
    return (req: Request, res: Response, next: NextFunction) => {
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
