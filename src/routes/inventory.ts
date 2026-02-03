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
} from "../controllers/inventoryController";

const router = Router();

// All routes require authentication and admin/employee role
router.use(protect);
router.use(authorize("admin", "employee"));

// Get inventory statistics
router.get("/stats", generalRateLimit, getInventoryStats);

// Get inventory history
router.get("/history", generalRateLimit, getInventoryHistory);

// Get all inventories
router.get("/", generalRateLimit, getInventories);

// Get single inventory
router.get("/:id", generalRateLimit, getInventory);

// Create new inventory
router.post("/", adminRateLimit, createInventory);

// Update inventory
router.put("/:id", adminRateLimit, updateInventory);

// Adjust stock (import/export)
router.post("/:id/adjust", adminRateLimit, adjustStock);

// Delete inventory (Admin, Employee)
router.delete("/:id", adminRateLimit, deleteInventory);

export default router;
