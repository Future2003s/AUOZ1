import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import { staticDataCache } from "../middleware/compression";
import {
    getHomepageSettings,
    getDraftHomepageSettings,
    updateHomepageSettings
} from "../controllers/homepageController";

const router = Router();

// Public route - Get published homepage settings
router.get("/", staticDataCache(300), getHomepageSettings); // Cache for 5 minutes

// Protected routes - Admin only
router.get("/draft", protect, authorize("admin"), adminRateLimit, getDraftHomepageSettings);
router.put("/", protect, authorize("admin"), adminRateLimit, updateHomepageSettings);

export default router;

