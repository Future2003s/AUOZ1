"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const purchaseController_1 = require("../controllers/purchaseController");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
// ─── Purchase Requisitions ────────────────────────────────────────────────────
router.get("/requisitions", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), purchaseController_1.purchaseController.listPRs);
router.post("/requisitions", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin", "employee"), purchaseController_1.purchaseController.createPR);
router.put("/requisitions/:id/approve", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin"), purchaseController_1.purchaseController.approvePR);
// ─── Purchase Orders ──────────────────────────────────────────────────────────
router.get("/orders", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), purchaseController_1.purchaseController.listPOs);
router.post("/orders", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin"), purchaseController_1.purchaseController.createPO);
router.get("/orders/:id", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), purchaseController_1.purchaseController.getPO);
router.put("/orders/:id/approve", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin"), purchaseController_1.purchaseController.approvePO);
// ─── Goods Receipts ────────────────────────────────────────────────────────────
router.get("/receipts", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), purchaseController_1.purchaseController.listGRs);
router.post("/receipts", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin", "employee"), purchaseController_1.purchaseController.receiveGoods);
// ─── 3-Way Match ───────────────────────────────────────────────────────────────
router.post("/match", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin"), purchaseController_1.purchaseController.threeWayMatch);
exports.default = router;
