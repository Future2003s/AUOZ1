"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const compression_1 = require("../middleware/compression");
const activityController_1 = require("../controllers/activityController");
const router = (0, express_1.Router)();
// Public routes
router.get("/", (0, compression_1.staticDataCache)(60), activityController_1.getAllActivities); // Cache for 1 minute
router.get("/:id", (0, compression_1.staticDataCache)(300), activityController_1.getActivityById); // Cache for 5 minutes
// Protected routes - Admin only
router.get("/admin/all", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, activityController_1.getAllActivitiesAdmin);
router.get("/admin/:id", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, activityController_1.getActivityByIdAdmin);
router.post("/", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, activityController_1.createActivity);
router.put("/:id", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, activityController_1.updateActivity);
router.patch("/:id/toggle", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, activityController_1.toggleActivityPublished);
router.delete("/:id", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, activityController_1.deleteActivity);
exports.default = router;
