import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, email, password, phone, role } = req.body;

    const result = await AuthService.register({
        firstName,
        lastName,
        email,
        password,
        phone,
        role
    } as any);

    ResponseHandler.authCreated(res, result, "User registered successfully.");
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    try {
    const result = await AuthService.login({ email, password });
        return ResponseHandler.authSuccess(res, result, "Login successful");
    } catch (error) {
        if (error instanceof AppError && (error.statusCode === 401 || error.statusCode === 429)) {
            const attemptInfo = (error as any)?.loginAttempts;

            if (attemptInfo) {
                const attemptsRemaining = Math.max(
                    attemptInfo.maxAttempts - attemptInfo.attempts,
                    0
                );

                const message =
                    error.statusCode === 429
                        ? `Bạn đã vượt quá ${attemptInfo.maxAttempts} lần đăng nhập sai. Tài khoản tạm khóa ${attemptInfo.lockDurationSeconds} giây.`
                        : `Email hoặc mật khẩu không đúng. Bạn đã nhập sai ${attemptInfo.attempts}/${attemptInfo.maxAttempts} lần. ${
                              attemptsRemaining > 0
                                  ? `Bạn còn ${attemptsRemaining} lần thử trong ${attemptInfo.lockDurationSeconds} giây.`
                                  : `Nếu tiếp tục sai, tài khoản sẽ bị khóa ${attemptInfo.lockDurationSeconds} giây.`
                          }`;

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
export const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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

    ResponseHandler.success(res, null, "Logout successful");
});

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    const result = await AuthService.refreshToken(refreshToken);

    ResponseHandler.success(res, result, "Token refreshed successfully");
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    await AuthService.forgotPassword(email);

    ResponseHandler.success(res, null, "Password reset email sent");
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { password } = req.body;

    const result = await AuthService.resetPassword(token, password);

    ResponseHandler.success(res, result, "Password reset successful");
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
export const verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;

    await AuthService.verifyEmail(token);

    ResponseHandler.success(res, null, "Email verified successfully");
});

// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Public
export const resendVerification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    await AuthService.resendVerification(email);

    ResponseHandler.success(res, null, "Verification email sent");
});

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;

    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    ResponseHandler.success(res, null, "Password changed successfully");
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Use _id or id depending on what's available in req.user
    const userId = req.user._id || req.user.id;
    const user = await AuthService.getUserById(userId);

    ResponseHandler.success(res, user, "User profile retrieved successfully");
});
