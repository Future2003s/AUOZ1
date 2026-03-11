import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import { purchaseController } from "../controllers/purchaseController";

const router = Router();

router.use(protect);

// ─── Purchase Requisitions ────────────────────────────────────────────────────
router.get("/requisitions", generalRateLimit, authorize("admin", "employee"), purchaseController.listPRs);
router.post("/requisitions", adminRateLimit, authorize("admin", "employee"), purchaseController.createPR);
router.put("/requisitions/:id/approve", adminRateLimit, authorize("admin"), purchaseController.approvePR);

// ─── Purchase Orders ──────────────────────────────────────────────────────────
router.get("/orders", generalRateLimit, authorize("admin", "employee"), purchaseController.listPOs);
router.post("/orders", adminRateLimit, authorize("admin"), purchaseController.createPO);
router.get("/orders/:id", generalRateLimit, authorize("admin", "employee"), purchaseController.getPO);
router.put("/orders/:id/approve", adminRateLimit, authorize("admin"), purchaseController.approvePO);

// ─── Goods Receipts ────────────────────────────────────────────────────────────
router.get("/receipts", generalRateLimit, authorize("admin", "employee"), purchaseController.listGRs);
router.post("/receipts", adminRateLimit, authorize("admin", "employee"), purchaseController.receiveGoods);

// ─── 3-Way Match ───────────────────────────────────────────────────────────────
router.post("/match", adminRateLimit, authorize("admin"), purchaseController.threeWayMatch);

export default router;
