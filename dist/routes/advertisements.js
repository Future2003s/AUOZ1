"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const compression_1 = require("../middleware/compression");
const advertisementController_1 = require("../controllers/advertisementController");
const router = (0, express_1.Router)();
// Public route - Get active advertisement
router.get("/active", (0, compression_1.staticDataCache)(60), advertisementController_1.getActiveAdvertisement); // Cache for 1 minute
// Protected routes - Admin only
router.get("/", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, advertisementController_1.getAllAdvertisements);
router.get("/:id", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, advertisementController_1.getAdvertisementById);
router.post("/", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, advertisementController_1.createAdvertisement);
router.put("/:id", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, advertisementController_1.updateAdvertisement);
router.patch("/:id/toggle", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, advertisementController_1.toggleAdvertisement);
router.delete("/:id", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, advertisementController_1.deleteAdvertisement);
exports.default = router;
