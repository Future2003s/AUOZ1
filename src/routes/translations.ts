import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import { staticDataCache } from "../middleware/compression";
import { validateTranslationKey, validateTranslation, validateBulkTranslations } from "../middleware/unifiedValidation";
import {
    getTranslation,
    getTranslations,
    getTranslationsByCategory,
    getPaginatedTranslations,
    createTranslation,
    updateTranslation,
    deleteTranslation,
    searchTranslations,
    getTranslationStats,
    bulkImportTranslations,
    exportTranslations
} from "../controllers/translationController";

const router = Router();

// Public routes for getting translations (with caching and validation)
router.get("/key/:key", staticDataCache(3600), generalRateLimit, validateTranslationKey, getTranslation);
router.post("/bulk", staticDataCache(1800), generalRateLimit, validateBulkTranslations, getTranslations);
router.get("/category/:category", staticDataCache(3600), generalRateLimit, getTranslationsByCategory);

// Admin routes for managing translations
router.use(protect);
router.use(authorize("admin", "translator"));

// CRUD operations with validation
router.get("/", adminRateLimit, getPaginatedTranslations);
router.post("/", adminRateLimit, validateTranslation, createTranslation);
router.put("/:key", adminRateLimit, validateTranslationKey, validateTranslation, updateTranslation);
router.delete("/:key", adminRateLimit, validateTranslationKey, deleteTranslation);

// Search and statistics with validation
router.get("/search", adminRateLimit, searchTranslations);
router.get("/stats", adminRateLimit, getTranslationStats);

// Bulk operations with validation
router.post("/bulk-import", adminRateLimit, validateBulkTranslations, bulkImportTranslations);
router.get("/export", adminRateLimit, exportTranslations);

export default router;
