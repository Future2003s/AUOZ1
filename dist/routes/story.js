"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const compression_1 = require("../middleware/compression");
const storyController_1 = require("../controllers/storyController");
const router = (0, express_1.Router)();
// Public route - Get published story settings
router.get("/", (0, compression_1.staticDataCache)(300), storyController_1.getStorySettings); // Cache for 5 minutes
// Admin routes
router.get("/draft", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, storyController_1.getDraftStorySettings);
router.put("/", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, storyController_1.updateStorySettings);
router.post("/publish", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, storyController_1.publishStorySettings);
exports.default = router;
