import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { generalRateLimit, adminRateLimit } from "../middleware/rateLimiting";
import {
    getInventories,
    getInventory,
    createInventory,
    updateInventory,
    deleteInventory,
    adjustStock,
    getInventoryStats,
    getInventoryHistory,
    reportDefective,
    getDefectiveReports,
    resolveDefective,
    returnProduct,
    changeStatus,
} from "../controllers/inventoryController";

const router = Router();

// All routes require authentication and admin/employee role
router.use(protect);
router.use(authorize("admin", "employee"));

// ─── Stats & Reports ─────────────────────────────────────────────────
router.get("/stats", generalRateLimit, getInventoryStats);
router.get("/history", generalRateLimit, getInventoryHistory);
router.get("/defective-reports", generalRateLimit, getDefectiveReports);

// ─── Defective report resolution ─────────────────────────────────────
router.post("/defective-reports/:id/resolve", adminRateLimit, resolveDefective);

// ─── CRUD ────────────────────────────────────────────────────────────
router.get("/", generalRateLimit, getInventories);
router.get("/:id", generalRateLimit, getInventory);
router.post("/", adminRateLimit, createInventory);
router.put("/:id", adminRateLimit, updateInventory);
router.delete("/:id", adminRateLimit, deleteInventory);

// ─── Stock operations ────────────────────────────────────────────────
router.post("/:id/adjust", adminRateLimit, adjustStock);
router.post("/:id/defective", adminRateLimit, reportDefective);
router.post("/:id/return", adminRateLimit, returnProduct);
router.post("/:id/status-change", adminRateLimit, changeStatus);

export default router;
