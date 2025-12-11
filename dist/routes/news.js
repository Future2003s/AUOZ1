"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const newsController_1 = require("../controllers/newsController");
const router = (0, express_1.Router)();
// Admin routes
router.post("/", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, newsController_1.createNews);
router.get("/admin/list", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, newsController_1.getAdminNews);
router.get("/admin/:id", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, newsController_1.getAdminNewsById);
router.put("/admin/:id", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, newsController_1.updateNews);
router.delete("/admin/:id", auth_1.protect, (0, auth_1.authorize)("admin"), rateLimiting_1.adminRateLimit, newsController_1.deleteNews);
// Public routes
router.get("/", rateLimiting_1.generalRateLimit, newsController_1.getPublicNews);
router.get("/:slug", rateLimiting_1.generalRateLimit, newsController_1.getNewsBySlug);
exports.default = router;
