import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import { bomController } from "../controllers/bomController";

const router = Router();

// All BOM routes require authentication
router.use(protect);

// ─── BOM CRUD ────────────────────────────────────────────────────────────────
router.get("/", generalRateLimit, authorize("admin", "employee"), bomController.listBoms);
router.post("/", adminRateLimit, authorize("admin"), bomController.createBom);
router.get("/:id", generalRateLimit, authorize("admin", "employee"), bomController.getBom);
router.put("/:id/status", adminRateLimit, authorize("admin"), bomController.changeStatus);

// ─── BOM Analysis ────────────────────────────────────────────────────────────
router.get("/:id/explosion", generalRateLimit, authorize("admin", "employee"), bomController.getExplosion);
router.get("/:id/tree", generalRateLimit, authorize("admin", "employee"), bomController.getTree);

export default router;
