import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import { staticDataCache } from "../middleware/compression";
import {
    getTranslation,
    getTranslations,
    getAllTranslations,
    getTranslationsByBaseKey,
    upsertTranslation,
    bulkImport,
    getPaginatedTranslations
} from "../controllers/translationControllerV2";

const router = Router();

// Public routes for getting translations (with caching)
router.get("/key/:key", staticDataCache(3600), generalRateLimit, getTranslation);
router.post("/bulk", staticDataCache(1800), generalRateLimit, getTranslations);
router.get("/all", staticDataCache(3600), generalRateLimit, getAllTranslations);
router.get("/base/:baseKey", staticDataCache(3600), generalRateLimit, getTranslationsByBaseKey);

// Admin routes for managing translations
router.use(protect);
router.use(authorize("admin", "translator"));

// CRUD operations
router.get("/admin", adminRateLimit, getPaginatedTranslations);
router.post("/admin", adminRateLimit, upsertTranslation);
router.post("/admin/bulk-import", adminRateLimit, bulkImport);

export default router;

