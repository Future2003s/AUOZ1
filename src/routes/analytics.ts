import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { adminRateLimit } from "../middleware/rateLimiting";
import { staticDataCache } from "../middleware/compression";
import { validateUserId, validateProductId, validatePagination } from "../middleware/unifiedValidation";
import {
    getDashboardAnalytics,
    getProductAnalytics,
    getUserAnalytics,
    getRealTimeAnalytics,
    getPerformanceAnalytics,
    getTopProducts,
    getConversionFunnel,
    exportAnalytics,
    clearAnalyticsCache
} from "../controllers/analyticsController";

const router = Router();

// All analytics routes require authentication
router.use(protect);

// Dashboard analytics (accessible by admin and seller)
router.get("/dashboard", authorize("admin", "seller"), staticDataCache(300), adminRateLimit, getDashboardAnalytics);

// Product analytics (accessible by admin and seller)
router.get("/products/top", authorize("admin", "seller"), staticDataCache(600), adminRateLimit, getTopProducts);
router.get(
    "/products/:productId",
    authorize("admin", "seller"),
    staticDataCache(300),
    adminRateLimit,
    validateProductId,
    getProductAnalytics
);

// User analytics (admin only)
router.get("/users/:userId", authorize("admin"), adminRateLimit, validateUserId, getUserAnalytics);

// Real-time analytics (admin only)
router.get("/realtime", authorize("admin"), getRealTimeAnalytics);

// Performance analytics (admin only)
router.get("/performance", authorize("admin"), staticDataCache(60), adminRateLimit, getPerformanceAnalytics);

// Conversion funnel (admin and seller)
router.get("/funnel", authorize("admin", "seller"), staticDataCache(300), adminRateLimit, getConversionFunnel);

// Export analytics (admin only)
router.get("/export", authorize("admin"), adminRateLimit, exportAnalytics);

// Clear cache (admin only)
router.delete("/cache", authorize("admin"), adminRateLimit, clearAnalyticsCache);

export default router;
