import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import { staticDataCache } from "../middleware/compression";
import {
    getAllActivities,
    getActivityById,
    getAllActivitiesAdmin,
    getActivityByIdAdmin,
    createActivity,
    updateActivity,
    deleteActivity,
    toggleActivityPublished
} from "../controllers/activityController";

const router = Router();

// Public routes
router.get("/", staticDataCache(60), getAllActivities); // Cache for 1 minute
router.get("/:id", staticDataCache(300), getActivityById); // Cache for 5 minutes

// Protected routes - Admin only
router.get("/admin/all", protect, authorize("admin"), adminRateLimit, getAllActivitiesAdmin);
router.get("/admin/:id", protect, authorize("admin"), adminRateLimit, getActivityByIdAdmin);
router.post("/", protect, authorize("admin"), adminRateLimit, createActivity);
router.put("/:id", protect, authorize("admin"), adminRateLimit, updateActivity);
router.patch("/:id/toggle", protect, authorize("admin"), adminRateLimit, toggleActivityPublished);
router.delete("/:id", protect, authorize("admin"), adminRateLimit, deleteActivity);

export default router;

