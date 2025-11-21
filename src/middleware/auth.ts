import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { AppError } from "../utils/AppError";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { CacheWrapper } from "../utils/performance";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/redis";
import { logger } from "../utils/logger";

// Extend Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

// Optimized JWT cache
const jwtCache = new CacheWrapper(CACHE_PREFIXES.USERS, CACHE_TTL.SHORT);
const tokenBlacklist = new CacheWrapper("blacklist", CACHE_TTL.VERY_LONG);

// Token validation cache to avoid repeated JWT verification with LRU eviction
const tokenValidationCache = new Map<string, { decoded: any; expires: number; lastAccessed: number }>();

// Cleanup expired cache entries periodically
setInterval(
    () => {
        const now = Date.now();
        for (const [token, data] of tokenValidationCache.entries()) {
            if (now > data.expires || now - data.lastAccessed > 30 * 60 * 1000) {
                // 30 min idle timeout
                tokenValidationCache.delete(token);
            }
        }
    },
    5 * 60 * 1000
); // Cleanup every 5 minutes

// Protect routes - require authentication (Optimized)
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    // Make sure token exists
    if (!token) {
        return next(new AppError("Not authorized to access this route", 401));
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklist.get(token);
    if (isBlacklisted) {
        return next(new AppError("Token has been revoked", 401));
    }

    try {
        let decoded: any;

        // Check token validation cache first
        const cachedValidation = tokenValidationCache.get(token);
        if (cachedValidation && Date.now() < cachedValidation.expires) {
            decoded = cachedValidation.decoded;
            cachedValidation.lastAccessed = Date.now(); // Update access time
            logger.debug("JWT validation cache hit");
        } else {
            // Verify token
            decoded = jwt.verify(token, config.jwt.secret) as any;

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
        let user: any = await jwtCache.get(cacheKey);

        if (!user) {
            // Get user from database
            user = await User.findById(decoded.id).select("-password").lean();

            if (user) {
                // Ensure a stable id field exists when using lean() (virtuals are not present)
                if (user && user._id && !user.id) {
                    user.id = String(user._id);
                }
                // Cache user for 5 minutes
                await jwtCache.set(cacheKey, user, CACHE_TTL.SHORT);
            }
        } else {
            // If cached user lacks id (older cache), add it now and refresh cache
            if (user && user._id && !user.id) {
                user.id = String(user._id);
                await jwtCache.set(cacheKey, user, CACHE_TTL.SHORT);
            }
        }

        if (!user) {
            return next(new AppError("No user found with this token", 401));
        }

        // Check if user is active
        if (!(user as any).isActive) {
            return next(new AppError("User account is deactivated", 401));
        }

        // Attach to request
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new AppError("Invalid token", 401));
        } else if (error instanceof jwt.TokenExpiredError) {
            return next(new AppError("Token expired", 401));
        } else if (error instanceof AppError) {
            return next(error);
        } else {
            logger.error("JWT verification error:", error);
            return next(new AppError("Not authorized to access this route", 401));
        }
    }
});

// Grant access to specific roles
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError("Not authorized to access this route", 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError(`User role ${req.user.role} is not authorized to access this route`, 403));
        }

        next();
    };
};

// Optional authentication - doesn't require token but adds user if present
export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwt.secret) as any;
            const user = await User.findById(decoded.id).select("-password");

            if (user && user.isActive) {
                req.user = user;
            }
        } catch (error) {
            // Token is invalid, but we continue without user
        }
    }

    next();
});
