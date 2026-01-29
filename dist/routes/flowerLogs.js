"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const flowerLogController_1 = require("../controllers/flowerLogController");
const flowerLogCatalogController_1 = require("../controllers/flowerLogCatalogController");
const rateLimiting_1 = require("../middleware/rateLimiting");
const router = (0, express_1.Router)();
// Test route to verify endpoint is working
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Flower logs endpoint is working!",
        timestamp: new Date().toISOString()
    });
});
// Public routes with rate limiting (NO AUTHENTICATION REQUIRED)
router.get("/", rateLimiting_1.generalRateLimit, flowerLogController_1.getFlowerLogs);
// Catalog routes MUST be before "/:id"
router.get("/catalog", rateLimiting_1.generalRateLimit, flowerLogCatalogController_1.getFlowerLogCatalog);
router.put("/catalog", rateLimiting_1.generalRateLimit, flowerLogCatalogController_1.upsertFlowerLogCatalog);
router.get("/:id", rateLimiting_1.generalRateLimit, flowerLogController_1.getFlowerLog);
router.post("/", rateLimiting_1.generalRateLimit, flowerLogController_1.createFlowerLog);
router.put("/:id", rateLimiting_1.generalRateLimit, flowerLogController_1.updateFlowerLog);
router.delete("/:id", rateLimiting_1.generalRateLimit, flowerLogController_1.deleteFlowerLog);
exports.default = router;
