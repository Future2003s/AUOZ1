import { Router } from "express";
import { protect } from "../middleware/auth";
import { authRateLimit, generalRateLimit } from "../middleware/rateLimiting";
import { staticDataCache } from "../middleware/compression";
import { ensureVietnameseEncoding, sanitizeVietnameseText } from "../middleware/encoding";
import { validateRegister, validateLogin, noValidation } from "../middleware/workingValidation";
import {
    changePassword,
    forgotPassword,
    getMe,
    login,
    logout,
    refreshToken,
    register,
    resetPassword
    // resendVerification, // Email verification disabled
    // verifyEmail // Email verification disabled
} from "../controllers/authController";

const router = Router();

// Public routes with enhanced rate limiting
router.post("/register", authRateLimit, ensureVietnameseEncoding, sanitizeVietnameseText, validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/logout", protect, generalRateLimit, logout); // Now requires authentication
router.post("/refresh-token", authRateLimit, noValidation, refreshToken);
router.post("/forgot-password", authRateLimit, noValidation, forgotPassword);
router.put("/reset-password/:token", authRateLimit, noValidation, resetPassword);
// Email verification disabled - users are automatically verified upon registration
// router.get("/verify-email/:token", generalRateLimit, verifyEmail);
// router.post("/resend-verification", authRateLimit, resendVerification);

// Protected routes with optimized middleware
router.get("/me", protect, getMe);
router.put("/change-password", protect, authRateLimit, noValidation, changePassword);

export default router;
