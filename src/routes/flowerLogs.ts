import { Router } from "express";
import {
    getFlowerLogs,
    getFlowerLog,
    createFlowerLog,
    updateFlowerLog,
    deleteFlowerLog
} from "../controllers/flowerLogController";
import {
    getFlowerLogCatalog,
    upsertFlowerLogCatalog
} from "../controllers/flowerLogCatalogController";
import { generalRateLimit } from "../middleware/rateLimiting";

const router = Router();

// Test route to verify endpoint is working
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Flower logs endpoint is working!",
        timestamp: new Date().toISOString()
    });
});

// Public routes with rate limiting (NO AUTHENTICATION REQUIRED)
router.get("/", generalRateLimit, getFlowerLogs);
// Catalog routes MUST be before "/:id"
router.get("/catalog", generalRateLimit, getFlowerLogCatalog);
router.put("/catalog", generalRateLimit, upsertFlowerLogCatalog);
router.get("/:id", generalRateLimit, getFlowerLog);
router.post("/", generalRateLimit, createFlowerLog);
router.put("/:id", generalRateLimit, updateFlowerLog);
router.delete("/:id", generalRateLimit, deleteFlowerLog);

export default router;

