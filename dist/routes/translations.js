"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const compression_1 = require("../middleware/compression");
const unifiedValidation_1 = require("../middleware/unifiedValidation");
const translationController_1 = require("../controllers/translationController");
const router = (0, express_1.Router)();
// Public routes for getting translations (with caching and validation)
router.get("/key/:key", (0, compression_1.staticDataCache)(3600), rateLimiting_1.generalRateLimit, unifiedValidation_1.validateTranslationKey, translationController_1.getTranslation);
router.post("/bulk", (0, compression_1.staticDataCache)(1800), rateLimiting_1.generalRateLimit, unifiedValidation_1.validateBulkTranslations, translationController_1.getTranslations);
router.get("/category/:category", (0, compression_1.staticDataCache)(3600), rateLimiting_1.generalRateLimit, translationController_1.getTranslationsByCategory);
// Admin routes for managing translations
router.use(auth_1.protect);
router.use((0, auth_1.authorize)("admin", "translator"));
// CRUD operations with validation
router.get("/", rateLimiting_1.adminRateLimit, translationController_1.getPaginatedTranslations);
router.post("/", rateLimiting_1.adminRateLimit, unifiedValidation_1.validateTranslation, translationController_1.createTranslation);
router.put("/:key", rateLimiting_1.adminRateLimit, unifiedValidation_1.validateTranslationKey, unifiedValidation_1.validateTranslation, translationController_1.updateTranslation);
router.delete("/:key", rateLimiting_1.adminRateLimit, unifiedValidation_1.validateTranslationKey, translationController_1.deleteTranslation);
// Search and statistics with validation
router.get("/search", rateLimiting_1.adminRateLimit, translationController_1.searchTranslations);
router.get("/stats", rateLimiting_1.adminRateLimit, translationController_1.getTranslationStats);
// Bulk operations with validation
router.post("/bulk-import", rateLimiting_1.adminRateLimit, unifiedValidation_1.validateBulkTranslations, translationController_1.bulkImportTranslations);
router.get("/export", rateLimiting_1.adminRateLimit, translationController_1.exportTranslations);
exports.default = router;
