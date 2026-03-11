import { Router } from "express";
import {
    getFlowerImportLogs,
    getFlowerImportLog,
    createFlowerImportLog,
    updateFlowerImportLog,
    deleteFlowerImportLog
} from "../controllers/flowerImportLogController";
import { generalRateLimit } from "../middleware/rateLimiting";

const router = Router();

// Test route to verify endpoint is working
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Flower import logs endpoint is working!",
        timestamp: new Date().toISOString()
    });
});

// Public routes with rate limiting (NO AUTHENTICATION REQUIRED)
router.get("/", generalRateLimit, getFlowerImportLogs);
router.get("/:id", generalRateLimit, getFlowerImportLog);
router.post("/", generalRateLimit, createFlowerImportLog);
router.put("/:id", generalRateLimit, updateFlowerImportLog);
router.delete("/:id", generalRateLimit, deleteFlowerImportLog);

export default router;
