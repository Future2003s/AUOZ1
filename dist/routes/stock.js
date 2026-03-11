"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const stockController_1 = require("../controllers/stockController");
const bomController_1 = require("../controllers/bomController");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
// ─── Stock Movements ──────────────────────────────────────────────────────────
router.post("/movements", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin", "employee"), stockController_1.stockController.recordMovement);
router.get("/movements", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), stockController_1.stockController.getMovements);
// ─── Stock per Item ───────────────────────────────────────────────────────────
router.get("/items/:id/stock", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), stockController_1.stockController.getItemStock);
router.get("/items/:id/fifo-value", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin"), stockController_1.stockController.getFIFOValue);
router.get("/items/:itemId/where-used", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), bomController_1.bomController.whereUsed);
// ─── Low Stock Alerts ─────────────────────────────────────────────────────────
router.get("/low-stock", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), stockController_1.stockController.getLowStock);
// ─── Warehouses ───────────────────────────────────────────────────────────────
router.get("/warehouses", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), stockController_1.stockController.listWarehouses);
router.get("/warehouses/:id/locations", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), stockController_1.stockController.listLocations);
exports.default = router;
