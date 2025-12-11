"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const compression_1 = require("../middleware/compression");
const homepageController_1 = require("../controllers/homepageController");
const router = (0, express_1.Router)();
// Public route - Get published homepage settings
router.get("/", (0, compression_1.staticDataCache)(300), homepageController_1.getHomepageSettings); // Cache for 5 minutes
// Protected routes - Admin only
router.get("/draft", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, homepageController_1.getDraftHomepageSettings);
router.put("/", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, homepageController_1.updateHomepageSettings);
exports.default = router;
