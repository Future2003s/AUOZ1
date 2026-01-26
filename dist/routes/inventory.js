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
// Get inventory statistics
router.get("/stats", rateLimiting_1.generalRateLimit, inventoryController_1.getInventoryStats);
// Get inventory history
router.get("/history", rateLimiting_1.generalRateLimit, inventoryController_1.getInventoryHistory);
// Get all inventories
router.get("/", rateLimiting_1.generalRateLimit, inventoryController_1.getInventories);
// Get single inventory
router.get("/:id", rateLimiting_1.generalRateLimit, inventoryController_1.getInventory);
// Create new inventory
router.post("/", rateLimiting_1.adminRateLimit, inventoryController_1.createInventory);
// Update inventory
router.put("/:id", rateLimiting_1.adminRateLimit, inventoryController_1.updateInventory);
// Adjust stock (import/export)
router.post("/:id/adjust", rateLimiting_1.adminRateLimit, inventoryController_1.adjustStock);
// Delete inventory (Admin only)
router.delete("/:id", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin"), inventoryController_1.deleteInventory);
exports.default = router;
