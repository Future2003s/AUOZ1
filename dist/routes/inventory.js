"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const inventoryController_1 = require("../controllers/inventoryController");
const router = (0, express_1.Router)();
// All routes require authentication and admin/employee role
router.use(auth_1.protect);
router.use((0, auth_1.authorize)("admin", "employee"));
// ─── Stats & Reports ─────────────────────────────────────────────────
router.get("/stats", rateLimiting_1.generalRateLimit, inventoryController_1.getInventoryStats);
router.get("/history", rateLimiting_1.generalRateLimit, inventoryController_1.getInventoryHistory);
router.get("/defective-reports", rateLimiting_1.generalRateLimit, inventoryController_1.getDefectiveReports);
// ─── Defective report resolution ─────────────────────────────────────
router.post("/defective-reports/:id/resolve", rateLimiting_1.adminRateLimit, inventoryController_1.resolveDefective);
// ─── CRUD ────────────────────────────────────────────────────────────
router.get("/", rateLimiting_1.generalRateLimit, inventoryController_1.getInventories);
router.get("/:id", rateLimiting_1.generalRateLimit, inventoryController_1.getInventory);
router.post("/", rateLimiting_1.adminRateLimit, inventoryController_1.createInventory);
router.put("/:id", rateLimiting_1.adminRateLimit, inventoryController_1.updateInventory);
router.delete("/:id", rateLimiting_1.adminRateLimit, inventoryController_1.deleteInventory);
// ─── Stock operations ────────────────────────────────────────────────
router.post("/:id/adjust", rateLimiting_1.adminRateLimit, inventoryController_1.adjustStock);
router.post("/:id/defective", rateLimiting_1.adminRateLimit, inventoryController_1.reportDefective);
router.post("/:id/return", rateLimiting_1.adminRateLimit, inventoryController_1.returnProduct);
router.post("/:id/status-change", rateLimiting_1.adminRateLimit, inventoryController_1.changeStatus);
exports.default = router;
