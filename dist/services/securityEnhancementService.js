"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityEnhancementService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config/config");
class SecurityEnhancementService {
    securityEvents = [];
    suspiciousIPs = new Set();
    rateLimitStore = new Map();
    maxEventsHistory = 10000;
    constructor() {
        this.initializeSecurityMonitoring();
    }
    initializeSecurityMonitoring() {
        // Clean old events every hour
        setInterval(() => {
            this.cleanupOldEvents();
        }, 60 * 60 * 1000);
        // Generate security reports every 30 minutes
        setInterval(() => {
            this.generateSecurityReport();
        }, 30 * 60 * 1000);
        // Clean rate limit store every 5 minutes
        setInterval(() => {
            this.cleanupRateLimitStore();
        }, 5 * 60 * 1000);
    }
    cleanupOldEvents() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.securityEvents = this.securityEvents.filter((event) => event.timestamp > oneDayAgo);
    }
    cleanupRateLimitStore() {
        const now = Date.now();
        for (const [key, data] of this.rateLimitStore.entries()) {
            if (data.resetTime < now) {
                this.rateLimitStore.delete(key);
            }
        }
    }
    recordSecurityEvent(event) {
        this.securityEvents.push(event);
        // Detect suspicious patterns
        this.detectSuspiciousActivity(event);
        // Maintain events history limit
        if (this.securityEvents.length > this.maxEventsHistory) {
            this.securityEvents = this.securityEvents.slice(-this.maxEventsHistory);
        }
        // Log critical events
        if (event.type === "suspicious_activity") {
            logger_1.logger.warn("🚨 Suspicious Activity Detected:", event);
        }
    }
    detectSuspiciousActivity(event) {
        const recentEvents = this.securityEvents.filter((e) => e.ip === event.ip && e.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        );
        // Multiple failed logins from same IP
        const failedLogins = recentEvents.filter((e) => e.type === "failed_login").length;
        if (failedLogins >= 5) {
            this.suspiciousIPs.add(event.ip);
            this.recordSecurityEvent({
                type: "suspicious_activity",
                ip: event.ip,
                userAgent: event.userAgent,
                timestamp: new Date(),
                details: { reason: "multiple_failed_logins", count: failedLogins }
            });
        }
        // Rapid requests from same IP
        if (recentEvents.length >= 50) {
            this.suspiciousIPs.add(event.ip);
            this.recordSecurityEvent({
                type: "suspicious_activity",
                ip: event.ip,
                userAgent: event.userAgent,
                timestamp: new Date(),
                details: { reason: "rapid_requests", count: recentEvents.length }
            });
        }
    }
    // Advanced Rate Limiting
    async checkRateLimit(key, limit, windowMs, req) {
        const now = Date.now();
        const resetTime = now + windowMs;
        let rateLimitData = this.rateLimitStore.get(key);
        if (!rateLimitData || rateLimitData.resetTime < now) {
            rateLimitData = { count: 0, resetTime };
            this.rateLimitStore.set(key, rateLimitData);
        }
        rateLimitData.count++;
        const allowed = rateLimitData.count <= limit;
        const remaining = Math.max(0, limit - rateLimitData.count);
        if (!allowed) {
            this.recordSecurityEvent({
                type: "rate_limit_exceeded",
                ip: req.ip || "unknown",
                userAgent: req.get("User-Agent") || "unknown",
                timestamp: new Date(),
                details: { key, limit, count: rateLimitData.count }
            });
        }
        return { allowed, remaining, resetTime: rateLimitData.resetTime };
    }
    // Two-Factor Authentication
    generateTwoFactorSecret() {
        const secret = crypto_1.default.randomBytes(32).toString("base64");
        const backupCodes = Array.from({ length: 10 }, () => crypto_1.default.randomBytes(4).toString("hex").toUpperCase());
        return {
            secret,
            backupCodes,
            isEnabled: false
        };
    }
    generateTOTP(secret, timeStep = 30) {
        const time = Math.floor(Date.now() / 1000 / timeStep);
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeUInt32BE(time, 4);
        const hmac = crypto_1.default.createHmac("sha1", Buffer.from(secret, "base64"));
        hmac.update(timeBuffer);
        const hash = hmac.digest();
        const offset = hash[hash.length - 1] & 0xf;
        const code = (hash.readUInt32BE(offset) & 0x7fffffff) % 1000000;
        return code.toString().padStart(6, "0");
    }
    verifyTOTP(secret, token, window = 1) {
        const currentTOTP = this.generateTOTP(secret);
        // Check current time window
        if (token === currentTOTP) {
            return true;
        }
        // Check previous and next time windows for clock drift
        for (let i = 1; i <= window; i++) {
            const pastTime = Math.floor(Date.now() / 1000 / 30) - i;
            const futureTime = Math.floor(Date.now() / 1000 / 30) + i;
            const pastTOTP = this.generateTOTPForTime(secret, pastTime);
            const futureTOTP = this.generateTOTPForTime(secret, futureTime);
            if (token === pastTOTP || token === futureTOTP) {
                return true;
            }
        }
        return false;
    }
    generateTOTPForTime(secret, time) {
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeUInt32BE(time, 4);
        const hmac = crypto_1.default.createHmac("sha1", Buffer.from(secret, "base64"));
        hmac.update(timeBuffer);
        const hash = hmac.digest();
        const offset = hash[hash.length - 1] & 0xf;
        const code = (hash.readUInt32BE(offset) & 0x7fffffff) % 1000000;
        return code.toString().padStart(6, "0");
    }
    // Password Security
    async hashPassword(password) {
        const saltRounds = 12;
        return bcryptjs_1.default.hash(password, saltRounds);
    }
    async verifyPassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    checkPasswordStrength(password) {
        const feedback = [];
        let score = 0;
        // Length check
        if (password.length >= 8)
            score += 1;
        else
            feedback.push("Password should be at least 8 characters long");
        if (password.length >= 12)
            score += 1;
        // Character variety
        if (/[a-z]/.test(password))
            score += 1;
        else
            feedback.push("Include lowercase letters");
        if (/[A-Z]/.test(password))
            score += 1;
        else
            feedback.push("Include uppercase letters");
        if (/\d/.test(password))
            score += 1;
        else
            feedback.push("Include numbers");
        if (/[^a-zA-Z\d]/.test(password))
            score += 1;
        else
            feedback.push("Include special characters");
        // Common patterns
        if (!/(.)\1{2,}/.test(password))
            score += 1;
        else
            feedback.push("Avoid repeating characters");
        if (!/123|abc|qwe|password|admin/i.test(password))
            score += 1;
        else
            feedback.push("Avoid common patterns");
        return { score, feedback };
    }
    // JWT Security Enhancements
    generateSecureToken(payload, expiresIn = "1h") {
        const jwtPayload = {
            ...payload,
            iat: Math.floor(Date.now() / 1000),
            jti: crypto_1.default.randomUUID() // Unique token ID
        };
        return jsonwebtoken_1.default.sign(jwtPayload, config_1.config.jwt.secret, {
            expiresIn: expiresIn,
            algorithm: "HS256",
            issuer: "shopdev-api",
            audience: "shopdev-client"
        });
    }
    verifySecureToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret, {
                algorithms: ["HS256"],
                issuer: "shopdev-api",
                audience: "shopdev-client"
            });
        }
        catch (error) {
            throw new Error("Invalid token");
        }
    }
    // Security Headers Middleware
    securityHeadersMiddleware() {
        return (req, res, next) => {
            // Content Security Policy
            res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
            // Prevent clickjacking
            res.setHeader("X-Frame-Options", "DENY");
            // Prevent MIME type sniffing
            res.setHeader("X-Content-Type-Options", "nosniff");
            // XSS Protection
            res.setHeader("X-XSS-Protection", "1; mode=block");
            // Referrer Policy
            res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
            // Permissions Policy
            res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
            next();
        };
    }
    // IP Blocking Middleware
    ipBlockingMiddleware() {
        return (req, res, next) => {
            const clientIP = req.ip || req.connection.remoteAddress || "unknown";
            if (this.suspiciousIPs.has(clientIP)) {
                logger_1.logger.warn(`🚫 Blocked suspicious IP: ${clientIP}`);
                return res.status(429).json({
                    error: "Access temporarily restricted",
                    code: "IP_BLOCKED"
                });
            }
            next();
        };
    }
    generateSecurityReport() {
        const metrics = this.getSecurityMetrics();
        logger_1.logger.info("🔒 Security Report:", {
            totalEvents: metrics.totalEvents,
            failedLogins: metrics.failedLogins,
            suspiciousActivities: metrics.suspiciousActivities,
            rateLimitViolations: metrics.rateLimitViolations,
            twoFactorUsage: metrics.twoFactorUsage,
            suspiciousIPs: this.suspiciousIPs.size
        });
    }
    getSecurityMetrics() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentEvents = this.securityEvents.filter((e) => e.timestamp > oneDayAgo);
        return {
            totalEvents: recentEvents.length,
            failedLogins: recentEvents.filter((e) => e.type === "failed_login").length,
            suspiciousActivities: recentEvents.filter((e) => e.type === "suspicious_activity").length,
            rateLimitViolations: recentEvents.filter((e) => e.type === "rate_limit_exceeded").length,
            twoFactorUsage: recentEvents.filter((e) => e.type === "2fa_attempt").length
        };
    }
    getSuspiciousIPs() {
        return Array.from(this.suspiciousIPs);
    }
    clearSuspiciousIP(ip) {
        return this.suspiciousIPs.delete(ip);
    }
    async clearSecurityEvents() {
        this.securityEvents = [];
        this.suspiciousIPs.clear();
        this.rateLimitStore.clear();
        logger_1.logger.info("🧹 Security events cleared");
    }
}
// Singleton instance
exports.securityEnhancementService = new SecurityEnhancementService();
