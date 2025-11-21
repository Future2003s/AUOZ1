"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config/config");
const AppError_1 = require("../utils/AppError");
const User_1 = require("../models/User");
const asyncHandler_1 = require("../utils/asyncHandler");
const performance_1 = require("../utils/performance");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
// Optimized JWT cache
const jwtCache = new performance_1.CacheWrapper(redis_1.CACHE_PREFIXES.USERS, redis_1.CACHE_TTL.SHORT);
const tokenBlacklist = new performance_1.CacheWrapper("blacklist", redis_1.CACHE_TTL.VERY_LONG);
// Token validation cache to avoid repeated JWT verification with LRU eviction
const tokenValidationCache = new Map();
// Cleanup expired cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of tokenValidationCache.entries()) {
        if (now > data.expires || now - data.lastAccessed > 30 * 60 * 1000) {
            // 30 min idle timeout
            tokenValidationCache.delete(token);
        }
    }
}, 5 * 60 * 1000); // Cleanup every 5 minutes
// Protect routes - require authentication (Optimized)
exports.protect = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    let token;
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    // Make sure token exists
    if (!token) {
        return next(new AppError_1.AppError("Not authorized to access this route", 401));
    }
    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklist.get(token);
    if (isBlacklisted) {
        return next(new AppError_1.AppError("Token has been revoked", 401));
    }
    try {
        let decoded;
        // Check token validation cache first
        const cachedValidation = tokenValidationCache.get(token);
        if (cachedValidation && Date.now() < cachedValidation.expires) {
            decoded = cachedValidation.decoded;
            cachedValidation.lastAccessed = Date.now(); // Update access time
            logger_1.logger.debug("JWT validation cache hit");
        }
        else {
            // Verify token
            decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            // Cache the validation result for 5 minutes
            tokenValidationCache.set(token, {
                decoded,
                expires: Date.now() + 5 * 60 * 1000,
                lastAccessed: Date.now()
            });
            // Limit cache size to prevent memory leaks (LRU eviction)
            if (tokenValidationCache.size > 1000) {
                // Remove least recently accessed entries
                const entries = Array.from(tokenValidationCache.entries());
                entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
                const toRemove = entries.slice(0, 100); // Remove oldest 100 entries
                toRemove.forEach(([key]) => tokenValidationCache.delete(key));
            }
        }
        // Try to get user from cache first
        const cacheKey = `user:${decoded.id}`;
        let user = await jwtCache.get(cacheKey);
        if (!user) {
            // Get user from database
            user = await User_1.User.findById(decoded.id).select("-password").lean();
            if (user) {
                // Ensure a stable id field exists when using lean() (virtuals are not present)
                if (user && user._id && !user.id) {
                    user.id = String(user._id);
                }
                // Cache user for 5 minutes
                await jwtCache.set(cacheKey, user, redis_1.CACHE_TTL.SHORT);
            }
        }
        else {
            // If cached user lacks id (older cache), add it now and refresh cache
            if (user && user._id && !user.id) {
                user.id = String(user._id);
                await jwtCache.set(cacheKey, user, redis_1.CACHE_TTL.SHORT);
            }
        }
        if (!user) {
            return next(new AppError_1.AppError("No user found with this token", 401));
        }
        // Check if user is active
        if (!user.isActive) {
            return next(new AppError_1.AppError("User account is deactivated", 401));
        }
        // Attach to request
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return next(new AppError_1.AppError("Invalid token", 401));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next(new AppError_1.AppError("Token expired", 401));
        }
        else if (error instanceof AppError_1.AppError) {
            return next(error);
        }
        else {
            logger_1.logger.error("JWT verification error:", error);
            return next(new AppError_1.AppError("Not authorized to access this route", 401));
        }
    }
});
// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError_1.AppError("Not authorized to access this route", 401));
        }
        if (!roles.includes(req.user.role)) {
            return next(new AppError_1.AppError(`User role ${req.user.role} is not authorized to access this route`, 403));
        }
        next();
    };
};
exports.authorize = authorize;
// Optional authentication - doesn't require token but adds user if present
exports.optionalAuth = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            const user = await User_1.User.findById(decoded.id).select("-password");
            if (user && user.isActive) {
                req.user = user;
            }
        }
        catch (error) {
            // Token is invalid, but we continue without user
        }
    }
    next();
});
