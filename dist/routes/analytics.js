"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const compression_1 = require("../middleware/compression");
const unifiedValidation_1 = require("../middleware/unifiedValidation");
const analyticsController_1 = require("../controllers/analyticsController");
const router = (0, express_1.Router)();
// All analytics routes require authentication
router.use(auth_1.protect);
// Dashboard analytics (accessible by admin and seller)
router.get("/dashboard", (0, auth_1.authorize)("admin", "seller"), (0, compression_1.staticDataCache)(300), rateLimiting_1.adminRateLimit, analyticsController_1.getDashboardAnalytics);
// Product analytics (accessible by admin and seller)
router.get("/products/top", (0, auth_1.authorize)("admin", "seller"), (0, compression_1.staticDataCache)(600), rateLimiting_1.adminRateLimit, analyticsController_1.getTopProducts);
router.get("/products/:productId", (0, auth_1.authorize)("admin", "seller"), (0, compression_1.staticDataCache)(300), rateLimiting_1.adminRateLimit, unifiedValidation_1.validateProductId, analyticsController_1.getProductAnalytics);
// User analytics (admin only)
router.get("/users/:userId", (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, unifiedValidation_1.validateUserId, analyticsController_1.getUserAnalytics);
// Real-time analytics (admin only)
router.get("/realtime", (0, auth_1.authorize)("admin"), analyticsController_1.getRealTimeAnalytics);
// Performance analytics (admin only)
router.get("/performance", (0, auth_1.authorize)("admin"), (0, compression_1.staticDataCache)(60), rateLimiting_1.adminRateLimit, analyticsController_1.getPerformanceAnalytics);
// Conversion funnel (admin and seller)
router.get("/funnel", (0, auth_1.authorize)("admin", "seller"), (0, compression_1.staticDataCache)(300), rateLimiting_1.adminRateLimit, analyticsController_1.getConversionFunnel);
// Export analytics (admin only)
router.get("/export", (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, analyticsController_1.exportAnalytics);
// Clear cache (admin only)
router.delete("/cache", (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, analyticsController_1.clearAnalyticsCache);
exports.default = router;
