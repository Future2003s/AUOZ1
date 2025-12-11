"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const User_1 = require("../models/User");
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config/config");
const performance_1 = require("../utils/performance");
// Create optimized cache instances for auth operations
const authCache = new performance_1.CacheWrapper("auth", 300); // 5 minutes
const tokenBlacklistCache = new performance_1.CacheWrapper("token_blacklist", 86400); // 24 hours
const rateLimitCache = new performance_1.CacheWrapper("rate_limit", 90); // 90 seconds lock window
const MAX_LOGIN_ATTEMPTS = 7;
const LOCK_DURATION_SECONDS = 90;
const ADMIN_EMAIL_SUFFIXES = ["@admin.com"];
const normalizeEmail = (email) => email.trim().toLowerCase();
const isAdminEmail = (email) => ADMIN_EMAIL_SUFFIXES.some((suffix) => normalizeEmail(email).endsWith(suffix));
class AuthService {
    /**
     * Register a new user with optimized performance
     */
    static async register(userData) {
        return performance_1.QueryAnalyzer.analyzeQuery("AuthService.register", async () => {
            try {
                // Check if user already exists using cached method (no password needed)
                const existingUser = await User_1.User.findByEmailCached(userData.email);
                if (existingUser) {
                    throw new AppError_1.AppError("User already exists with this email", 400);
                }
                // Create new user (allow role only in development)
                const user = await User_1.User.create({
                    ...userData,
                    ...(config_1.config.nodeEnv === "development" && userData.role ? { role: userData.role } : {})
                });
                // Log successful registration
                logger_1.logger.info(`User registered: ${userData.email}`);
                // Generate tokens
                const token = user.getSignedJwtToken();
                const refreshToken = user.getRefreshToken();
                // Cache user session info for faster subsequent requests
                await authCache.set(`session:${user._id}`, {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                    lastActivity: new Date()
                });
                // Remove password from response
                const userResponse = user.toObject();
                const { password: _, ...userWithoutPassword } = userResponse;
                // Record performance metrics
                performance_1.performanceMonitor.recordCacheHit();
                return {
                    user: userWithoutPassword,
                    token,
                    refreshToken
                };
            }
            catch (error) {
                logger_1.logger.error("Registration error:", error);
                performance_1.performanceMonitor.recordCacheMiss();
                throw error;
            }
        });
    }
    /**
     * Login user with optimized performance and rate limiting
     */
    static async login(loginData) {
        return performance_1.QueryAnalyzer.analyzeQuery("AuthService.login", async () => {
            try {
                const { email, password } = loginData;
                const normalizedEmail = normalizeEmail(email);
                const skipRateLimit = isAdminEmail(email);
                // Check rate limiting for failed login attempts
                const rateLimitKey = `login_attempts:${normalizedEmail}`;
                const attempts = skipRateLimit
                    ? 0
                    : Number((await rateLimitCache.get(rateLimitKey)) || 0);
                if (!skipRateLimit && attempts >= MAX_LOGIN_ATTEMPTS) {
                    const lockError = new AppError_1.AppError(`Too many login attempts. Please try again in ${LOCK_DURATION_SECONDS} seconds.`, 429);
                    lockError.loginAttempts = {
                        attempts: MAX_LOGIN_ATTEMPTS,
                        maxAttempts: MAX_LOGIN_ATTEMPTS,
                        lockDurationSeconds: LOCK_DURATION_SECONDS
                    };
                    throw lockError;
                }
                // Find user with password field for authentication
                const user = await User_1.User.findByEmailForAuth(email);
                if (!user || !(await user.matchPassword(password))) {
                    // Increment failed login attempts (skip for admin accounts)
                    const newAttempts = skipRateLimit ? 0 : attempts + 1;
                    if (!skipRateLimit) {
                        await rateLimitCache.set(rateLimitKey, newAttempts, LOCK_DURATION_SECONDS);
                    }
                    const invalidError = new AppError_1.AppError("Invalid credentials", 401);
                    if (!skipRateLimit) {
                        invalidError.loginAttempts = {
                            attempts: Math.min(newAttempts, MAX_LOGIN_ATTEMPTS),
                            maxAttempts: MAX_LOGIN_ATTEMPTS,
                            lockDurationSeconds: LOCK_DURATION_SECONDS
                        };
                    }
                    throw invalidError;
                }
                // Clear failed login attempts on successful login
                if (!skipRateLimit) {
                    await rateLimitCache.del(rateLimitKey);
                }
                // Check if user is active
                if (!user.isActive) {
                    throw new AppError_1.AppError("Account is deactivated", 401);
                }
                // Update last login asynchronously for better performance
                setImmediate(async () => {
                    try {
                        await User_1.User.findByIdAndUpdate(user._id, { lastLogin: new Date() }, { validateBeforeSave: false });
                    }
                    catch (error) {
                        logger_1.logger.error("Error updating last login:", error);
                    }
                });
                // Generate tokens
                const token = user.getSignedJwtToken();
                const refreshToken = user.getRefreshToken();
                // Cache user session info
                await authCache.set(`session:${user._id}`, {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                    lastActivity: new Date()
                });
                // Remove password from response
                const userResponse = user.toObject();
                const { password: _, ...userWithoutPassword } = userResponse;
                // Record successful login
                logger_1.logger.info(`User logged in: ${email}`);
                performance_1.performanceMonitor.recordCacheHit();
                return {
                    user: userWithoutPassword,
                    token,
                    refreshToken
                };
            }
            catch (error) {
                logger_1.logger.error("Login error:", error);
                performance_1.performanceMonitor.recordCacheMiss();
                throw error;
            }
        });
    }
    /**
     * Get user by ID
     */
    static async getUserById(userId) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            return user;
        }
        catch (error) {
            logger_1.logger.error("Get user error:", error);
            throw error;
        }
    }
    /**
     * Change user password
     */
    static async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await User_1.User.findById(userId).select("+password");
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            // Verify current password
            if (!(await user.matchPassword(currentPassword))) {
                throw new AppError_1.AppError("Current password is incorrect", 400);
            }
            // Update password
            user.password = newPassword;
            await user.save();
            logger_1.logger.info(`Password changed for user: ${user.email}`);
        }
        catch (error) {
            logger_1.logger.error("Change password error:", error);
            throw error;
        }
    }
    /**
     * Forgot password - generate reset token
     */
    static async forgotPassword(email) {
        try {
            const user = await User_1.User.findOne({ email });
            if (!user) {
                throw new AppError_1.AppError("No user found with that email", 404);
            }
            // Generate reset token
            const resetToken = user.generatePasswordResetToken();
            await user.save({ validateBeforeSave: false });
            // TODO: Send reset email
            logger_1.logger.info(`Password reset requested for: ${email}, token: ${resetToken}`);
            return resetToken;
        }
        catch (error) {
            logger_1.logger.error("Forgot password error:", error);
            throw error;
        }
    }
    /**
     * Reset password with token
     */
    static async resetPassword(token, newPassword) {
        try {
            // Find user by reset token
            const user = await User_1.User.findOne({
                passwordResetToken: token,
                passwordResetExpires: { $gt: Date.now() }
            });
            if (!user) {
                throw new AppError_1.AppError("Invalid or expired reset token", 400);
            }
            // Update password and clear reset token
            user.password = newPassword;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();
            // Generate new tokens
            const jwtToken = user.getSignedJwtToken();
            const refreshToken = user.getRefreshToken();
            // Remove password from response
            const userResponse = user.toObject();
            const { password: _, ...userWithoutPassword } = userResponse;
            logger_1.logger.info(`Password reset successful for user: ${user.email}`);
            return {
                user: userWithoutPassword,
                token: jwtToken,
                refreshToken
            };
        }
        catch (error) {
            logger_1.logger.error("Reset password error:", error);
            throw error;
        }
    }
    /**
     * Verify email with token
     */
    static async verifyEmail(token) {
        try {
            const user = await User_1.User.findOne({ emailVerificationToken: token });
            if (!user) {
                throw new AppError_1.AppError("Invalid verification token", 400);
            }
            user.isEmailVerified = true;
            user.emailVerificationToken = undefined;
            await user.save({ validateBeforeSave: false });
            logger_1.logger.info(`Email verified for user: ${user.email}`);
        }
        catch (error) {
            logger_1.logger.error("Email verification error:", error);
            throw error;
        }
    }
    /**
     * Resend verification email
     */
    static async resendVerification(email) {
        try {
            const user = await User_1.User.findOne({ email });
            if (!user) {
                throw new AppError_1.AppError("User not found", 404);
            }
            if (user.isEmailVerified) {
                throw new AppError_1.AppError("Email is already verified", 400);
            }
            const verificationToken = user.generateEmailVerificationToken();
            await user.save({ validateBeforeSave: false });
            // TODO: Send verification email
            logger_1.logger.info(`Verification email resent to: ${email}, token: ${verificationToken}`);
            return verificationToken;
        }
        catch (error) {
            logger_1.logger.error("Resend verification error:", error);
            throw error;
        }
    }
    /**
     * Refresh JWT token with rotation and optimized performance
     */
    static async refreshToken(refreshToken) {
        return performance_1.QueryAnalyzer.analyzeQuery("AuthService.refreshToken", async () => {
            try {
                // Check if token is blacklisted first (faster than JWT verification)
                const isBlacklisted = await tokenBlacklistCache.get(refreshToken);
                if (isBlacklisted) {
                    throw new AppError_1.AppError("Token has been revoked", 401);
                }
                // Verify refresh token
                const decoded = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwt.refreshSecret);
                // Get user using cached method
                const user = await User_1.User.findByIdCached(decoded.id);
                if (!user || !user.isActive) {
                    throw new AppError_1.AppError("Invalid refresh token", 401);
                }
                // Blacklist the old refresh token to prevent reuse
                await tokenBlacklistCache.set(refreshToken, true);
                // Generate new tokens (both access and refresh)
                const newToken = user.getSignedJwtToken();
                const newRefreshToken = user.getRefreshToken();
                // Update session cache
                await authCache.set(`session:${user._id}`, {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                    lastActivity: new Date()
                });
                logger_1.logger.info(`Token refreshed for user: ${user.email}`);
                performance_1.performanceMonitor.recordCacheHit();
                return {
                    token: newToken,
                    refreshToken: newRefreshToken
                };
            }
            catch (error) {
                logger_1.logger.error("Refresh token error:", error);
                performance_1.performanceMonitor.recordCacheMiss();
                throw new AppError_1.AppError("Invalid refresh token", 401);
            }
        });
    }
}
exports.AuthService = AuthService;
