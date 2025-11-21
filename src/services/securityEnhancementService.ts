import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { advancedCachingService } from "./advancedCachingService";
import { config } from "../config/config";

/**
 * Advanced Security Enhancement Service
 * Provides comprehensive security features including 2FA, advanced rate limiting,
 * security monitoring, and vulnerability protection
 */

interface SecurityEvent {
    type: "login_attempt" | "failed_login" | "suspicious_activity" | "rate_limit_exceeded" | "2fa_attempt";
    userId?: string;
    ip: string;
    userAgent: string;
    timestamp: Date;
    details?: any;
}

interface TwoFactorAuth {
    secret: string;
    backupCodes: string[];
    isEnabled: boolean;
    lastUsed?: Date;
}

interface SecurityMetrics {
    totalEvents: number;
    failedLogins: number;
    suspiciousActivities: number;
    rateLimitViolations: number;
    twoFactorUsage: number;
}

class SecurityEnhancementService {
    private securityEvents: SecurityEvent[] = [];
    private suspiciousIPs = new Set<string>();
    private rateLimitStore = new Map<string, { count: number; resetTime: number }>();
    private maxEventsHistory = 10000;

    constructor() {
        this.initializeSecurityMonitoring();
    }

    private initializeSecurityMonitoring(): void {
        // Clean old events every hour
        setInterval(
            () => {
                this.cleanupOldEvents();
            },
            60 * 60 * 1000
        );

        // Generate security reports every 30 minutes
        setInterval(
            () => {
                this.generateSecurityReport();
            },
            30 * 60 * 1000
        );

        // Clean rate limit store every 5 minutes
        setInterval(
            () => {
                this.cleanupRateLimitStore();
            },
            5 * 60 * 1000
        );
    }

    private cleanupOldEvents(): void {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.securityEvents = this.securityEvents.filter((event) => event.timestamp > oneDayAgo);
    }

    private cleanupRateLimitStore(): void {
        const now = Date.now();
        for (const [key, data] of this.rateLimitStore.entries()) {
            if (data.resetTime < now) {
                this.rateLimitStore.delete(key);
            }
        }
    }

    recordSecurityEvent(event: SecurityEvent): void {
        this.securityEvents.push(event);

        // Detect suspicious patterns
        this.detectSuspiciousActivity(event);

        // Maintain events history limit
        if (this.securityEvents.length > this.maxEventsHistory) {
            this.securityEvents = this.securityEvents.slice(-this.maxEventsHistory);
        }

        // Log critical events
        if (event.type === "suspicious_activity") {
            logger.warn("🚨 Suspicious Activity Detected:", event);
        }
    }

    private detectSuspiciousActivity(event: SecurityEvent): void {
        const recentEvents = this.securityEvents.filter(
            (e) => e.ip === event.ip && e.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
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
    async checkRateLimit(
        key: string,
        limit: number,
        windowMs: number,
        req: Request
    ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
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
    generateTwoFactorSecret(): TwoFactorAuth {
        const secret = crypto.randomBytes(32).toString("base64");
        const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString("hex").toUpperCase());

        return {
            secret,
            backupCodes,
            isEnabled: false
        };
    }

    generateTOTP(secret: string, timeStep = 30): string {
        const time = Math.floor(Date.now() / 1000 / timeStep);
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeUInt32BE(time, 4);

        const hmac = crypto.createHmac("sha1", Buffer.from(secret, "base64"));
        hmac.update(timeBuffer);
        const hash = hmac.digest();

        const offset = hash[hash.length - 1] & 0xf;
        const code = (hash.readUInt32BE(offset) & 0x7fffffff) % 1000000;

        return code.toString().padStart(6, "0");
    }

    verifyTOTP(secret: string, token: string, window = 1): boolean {
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

    private generateTOTPForTime(secret: string, time: number): string {
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeUInt32BE(time, 4);

        const hmac = crypto.createHmac("sha1", Buffer.from(secret, "base64"));
        hmac.update(timeBuffer);
        const hash = hmac.digest();

        const offset = hash[hash.length - 1] & 0xf;
        const code = (hash.readUInt32BE(offset) & 0x7fffffff) % 1000000;

        return code.toString().padStart(6, "0");
    }

    // Password Security
    async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    checkPasswordStrength(password: string): { score: number; feedback: string[] } {
        const feedback: string[] = [];
        let score = 0;

        // Length check
        if (password.length >= 8) score += 1;
        else feedback.push("Password should be at least 8 characters long");

        if (password.length >= 12) score += 1;

        // Character variety
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push("Include lowercase letters");

        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push("Include uppercase letters");

        if (/\d/.test(password)) score += 1;
        else feedback.push("Include numbers");

        if (/[^a-zA-Z\d]/.test(password)) score += 1;
        else feedback.push("Include special characters");

        // Common patterns
        if (!/(.)\1{2,}/.test(password)) score += 1;
        else feedback.push("Avoid repeating characters");

        if (!/123|abc|qwe|password|admin/i.test(password)) score += 1;
        else feedback.push("Avoid common patterns");

        return { score, feedback };
    }

    // JWT Security Enhancements
    generateSecureToken(payload: any, expiresIn = "1h"): string {
        const jwtPayload = {
            ...payload,
            iat: Math.floor(Date.now() / 1000),
            jti: crypto.randomUUID() // Unique token ID
        };

        return jwt.sign(jwtPayload, config.jwt.secret as string, {
            expiresIn: expiresIn as any,
            algorithm: "HS256",
            issuer: "shopdev-api",
            audience: "shopdev-client"
        });
    }

    verifySecureToken(token: string): any {
        try {
            return jwt.verify(token, config.jwt.secret, {
                algorithms: ["HS256"],
                issuer: "shopdev-api",
                audience: "shopdev-client"
            });
        } catch (error) {
            throw new Error("Invalid token");
        }
    }

    // Security Headers Middleware
    securityHeadersMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Content Security Policy
            res.setHeader(
                "Content-Security-Policy",
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
            );

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
        return (req: Request, res: Response, next: NextFunction) => {
            const clientIP = req.ip || req.connection.remoteAddress || "unknown";

            if (this.suspiciousIPs.has(clientIP)) {
                logger.warn(`🚫 Blocked suspicious IP: ${clientIP}`);
                return res.status(429).json({
                    error: "Access temporarily restricted",
                    code: "IP_BLOCKED"
                });
            }

            next();
        };
    }

    private generateSecurityReport(): void {
        const metrics = this.getSecurityMetrics();

        logger.info("🔒 Security Report:", {
            totalEvents: metrics.totalEvents,
            failedLogins: metrics.failedLogins,
            suspiciousActivities: metrics.suspiciousActivities,
            rateLimitViolations: metrics.rateLimitViolations,
            twoFactorUsage: metrics.twoFactorUsage,
            suspiciousIPs: this.suspiciousIPs.size
        });
    }

    getSecurityMetrics(): SecurityMetrics {
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

    getSuspiciousIPs(): string[] {
        return Array.from(this.suspiciousIPs);
    }

    clearSuspiciousIP(ip: string): boolean {
        return this.suspiciousIPs.delete(ip);
    }

    async clearSecurityEvents(): Promise<void> {
        this.securityEvents = [];
        this.suspiciousIPs.clear();
        this.rateLimitStore.clear();
        logger.info("🧹 Security events cleared");
    }
}

// Singleton instance
export const securityEnhancementService = new SecurityEnhancementService();
