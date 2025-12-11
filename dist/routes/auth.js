"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const encoding_1 = require("../middleware/encoding");
const workingValidation_1 = require("../middleware/workingValidation");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// Public routes with enhanced rate limiting
router.post("/register", rateLimiting_1.authRateLimit, encoding_1.ensureVietnameseEncoding, encoding_1.sanitizeVietnameseText, workingValidation_1.validateRegister, authController_1.register);
router.post("/login", workingValidation_1.validateLogin, authController_1.login);
router.post("/logout", auth_1.protect, rateLimiting_1.generalRateLimit, authController_1.logout); // Now requires authentication
router.post("/refresh-token", rateLimiting_1.authRateLimit, workingValidation_1.noValidation, authController_1.refreshToken);
router.post("/forgot-password", rateLimiting_1.authRateLimit, workingValidation_1.noValidation, authController_1.forgotPassword);
router.put("/reset-password/:token", rateLimiting_1.authRateLimit, workingValidation_1.noValidation, authController_1.resetPassword);
// Email verification disabled - users are automatically verified upon registration
// router.get("/verify-email/:token", generalRateLimit, verifyEmail);
// router.post("/resend-verification", authRateLimit, resendVerification);
// Protected routes with optimized middleware
router.get("/me", auth_1.protect, authController_1.getMe);
router.put("/change-password", auth_1.protect, rateLimiting_1.authRateLimit, workingValidation_1.noValidation, authController_1.changePassword);
exports.default = router;
