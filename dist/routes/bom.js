"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const bomController_1 = require("../controllers/bomController");
const router = (0, express_1.Router)();
// All BOM routes require authentication
router.use(auth_1.protect);
// ─── BOM CRUD ────────────────────────────────────────────────────────────────
router.get("/", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), bomController_1.bomController.listBoms);
router.post("/", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin"), bomController_1.bomController.createBom);
router.get("/:id", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), bomController_1.bomController.getBom);
router.put("/:id/status", rateLimiting_1.adminRateLimit, (0, auth_1.authorize)("admin"), bomController_1.bomController.changeStatus);
// ─── BOM Analysis ────────────────────────────────────────────────────────────
router.get("/:id/explosion", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), bomController_1.bomController.getExplosion);
router.get("/:id/tree", rateLimiting_1.generalRateLimit, (0, auth_1.authorize)("admin", "employee"), bomController_1.bomController.getTree);
exports.default = router;
