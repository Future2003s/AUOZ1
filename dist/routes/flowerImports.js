"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const flowerImportLogController_1 = require("../controllers/flowerImportLogController");
const rateLimiting_1 = require("../middleware/rateLimiting");
const router = (0, express_1.Router)();
// Test route to verify endpoint is working
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Flower import logs endpoint is working!",
        timestamp: new Date().toISOString()
    });
});
// Public routes with rate limiting (NO AUTHENTICATION REQUIRED)
router.get("/", rateLimiting_1.generalRateLimit, flowerImportLogController_1.getFlowerImportLogs);
router.get("/:id", rateLimiting_1.generalRateLimit, flowerImportLogController_1.getFlowerImportLog);
router.post("/", rateLimiting_1.generalRateLimit, flowerImportLogController_1.createFlowerImportLog);
router.put("/:id", rateLimiting_1.generalRateLimit, flowerImportLogController_1.updateFlowerImportLog);
router.delete("/:id", rateLimiting_1.generalRateLimit, flowerImportLogController_1.deleteFlowerImportLog);
exports.default = router;
