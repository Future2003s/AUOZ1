"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.changePassword = exports.resendVerification = exports.verifyEmail = exports.resetPassword = exports.forgotPassword = exports.refreshToken = exports.logout = exports.login = exports.register = void 0;
const authService_1 = require("../services/authService");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { firstName, lastName, email, password, phone, role } = req.body;
    const result = await authService_1.AuthService.register({
        firstName,
        lastName,
        email,
        password,
        phone,
        role
    });
    response_1.ResponseHandler.authCreated(res, result, "User registered successfully.");
});
// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const result = await authService_1.AuthService.login({ email, password });
        return response_1.ResponseHandler.authSuccess(res, result, "Login successful");
    }
    catch (error) {
        if (error instanceof AppError_1.AppError && (error.statusCode === 401 || error.statusCode === 429)) {
            const attemptInfo = error?.loginAttempts;
            if (attemptInfo) {
                const attemptsRemaining = Math.max(attemptInfo.maxAttempts - attemptInfo.attempts, 0);
                const message = error.statusCode === 429
                    ? `Bạn đã vượt quá ${attemptInfo.maxAttempts} lần đăng nhập sai. Tài khoản tạm khóa ${attemptInfo.lockDurationSeconds} giây.`
                    : `Email hoặc mật khẩu không đúng. Bạn đã nhập sai ${attemptInfo.attempts}/${attemptInfo.maxAttempts} lần. ${attemptsRemaining > 0
                        ? `Bạn còn ${attemptsRemaining} lần thử trong ${attemptInfo.lockDurationSeconds} giây.`
                        : `Nếu tiếp tục sai, tài khoản sẽ bị khóa ${attemptInfo.lockDurationSeconds} giây.`}`;
                return res.status(error.statusCode).json({
                    success: false,
                    error: message,
                    attemptsUsed: attemptInfo.attempts,
                    attemptsRemaining,
                    maxAttempts: attemptInfo.maxAttempts,
                    lockDurationSeconds: attemptInfo.lockDurationSeconds
                });
            }
        }
        throw error;
    }
});
// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    const { refreshToken } = req.body;
    if (token) {
        // Blacklist the access token
        const { CacheWrapper } = await import("../utils/performance.js");
        const tokenBlacklist = new CacheWrapper("blacklist", 24 * 60 * 60); // 24 hours
        await tokenBlacklist.set(token, true);
    }
    if (refreshToken) {
        // Blacklist the refresh token
        const { CacheWrapper } = await import("../utils/performance.js");
        const refreshBlacklist = new CacheWrapper("blacklist", 7 * 24 * 60 * 60); // 7 days
        await refreshBlacklist.set(refreshToken, true);
    }
    response_1.ResponseHandler.success(res, null, "Logout successful");
});
// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshToken = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { refreshToken } = req.body;
    const result = await authService_1.AuthService.refreshToken(refreshToken);
    response_1.ResponseHandler.success(res, result, "Token refreshed successfully");
});
// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { email } = req.body;
    await authService_1.AuthService.forgotPassword(email);
    response_1.ResponseHandler.success(res, null, "Password reset email sent");
});
// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;
    const result = await authService_1.AuthService.resetPassword(token, password);
    response_1.ResponseHandler.success(res, result, "Password reset successful");
});
// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
exports.verifyEmail = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { token } = req.params;
    await authService_1.AuthService.verifyEmail(token);
    response_1.ResponseHandler.success(res, null, "Email verified successfully");
});
// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Public
exports.resendVerification = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { email } = req.body;
    await authService_1.AuthService.resendVerification(email);
    response_1.ResponseHandler.success(res, null, "Verification email sent");
});
// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
exports.changePassword = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    await authService_1.AuthService.changePassword(req.user.id, currentPassword, newPassword);
    response_1.ResponseHandler.success(res, null, "Password changed successfully");
});
// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    // Use _id or id depending on what's available in req.user
    const userId = req.user._id || req.user.id;
    const user = await authService_1.AuthService.getUserById(userId);
    response_1.ResponseHandler.success(res, user, "User profile retrieved successfully");
});
