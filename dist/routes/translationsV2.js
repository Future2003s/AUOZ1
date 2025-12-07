"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const compression_1 = require("../middleware/compression");
const translationControllerV2_1 = require("../controllers/translationControllerV2");
const router = (0, express_1.Router)();
// Public routes for getting translations (with caching)
router.get("/key/:key", (0, compression_1.staticDataCache)(3600), rateLimiting_1.generalRateLimit, translationControllerV2_1.getTranslation);
router.post("/bulk", (0, compression_1.staticDataCache)(1800), rateLimiting_1.generalRateLimit, translationControllerV2_1.getTranslations);
router.get("/all", (0, compression_1.staticDataCache)(3600), rateLimiting_1.generalRateLimit, translationControllerV2_1.getAllTranslations);
router.get("/base/:baseKey", (0, compression_1.staticDataCache)(3600), rateLimiting_1.generalRateLimit, translationControllerV2_1.getTranslationsByBaseKey);
// Admin routes for managing translations
router.use(auth_1.protect);
router.use((0, auth_1.authorize)("admin", "translator"));
// CRUD operations
router.get("/admin", rateLimiting_1.adminRateLimit, translationControllerV2_1.getPaginatedTranslations);
router.post("/admin", rateLimiting_1.adminRateLimit, translationControllerV2_1.upsertTranslation);
router.post("/admin/bulk-import", rateLimiting_1.adminRateLimit, translationControllerV2_1.bulkImport);
exports.default = router;
