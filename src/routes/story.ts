import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { adminRateLimit, generalRateLimit } from "../middleware/rateLimiting";
import { staticDataCache } from "../middleware/compression";
import {
  getStorySettings,
  getDraftStorySettings,
  updateStorySettings,
  publishStorySettings,
} from "../controllers/storyController";

const router = Router();

// Public route - Get published story settings
router.get("/", staticDataCache(300), getStorySettings); // Cache for 5 minutes

// Admin routes
router.get("/draft", protect, authorize("admin"), adminRateLimit, getDraftStorySettings);
router.put("/", protect, authorize("admin"), adminRateLimit, updateStorySettings);
router.post("/publish", protect, authorize("admin"), adminRateLimit, publishStorySettings);

export default router;

