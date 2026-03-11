import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import { stockController } from "../controllers/stockController";
import { bomController } from "../controllers/bomController";

const router = Router();

router.use(protect);

// ─── Stock Movements ──────────────────────────────────────────────────────────
router.post("/movements", adminRateLimit, authorize("admin", "employee"), stockController.recordMovement);
router.get("/movements", generalRateLimit, authorize("admin", "employee"), stockController.getMovements);

// ─── Stock per Item ───────────────────────────────────────────────────────────
router.get("/items/:id/stock", generalRateLimit, authorize("admin", "employee"), stockController.getItemStock);
router.get("/items/:id/fifo-value", generalRateLimit, authorize("admin"), stockController.getFIFOValue);
router.get("/items/:itemId/where-used", generalRateLimit, authorize("admin", "employee"), bomController.whereUsed);

// ─── Low Stock Alerts ─────────────────────────────────────────────────────────
router.get("/low-stock", generalRateLimit, authorize("admin", "employee"), stockController.getLowStock);

// ─── Warehouses ───────────────────────────────────────────────────────────────
router.get("/warehouses", generalRateLimit, authorize("admin", "employee"), stockController.listWarehouses);
router.get("/warehouses/:id/locations", generalRateLimit, authorize("admin", "employee"), stockController.listLocations);

export default router;
