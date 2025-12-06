import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { adminRateLimit, generalRateLimit } from "../middleware/rateLimiting";
import {
  createTask,
  deleteTask,
  getTaskById,
  getTasks,
  getTasksByDate,
  toggleTaskStatus,
  updateTask,
} from "../controllers/taskController";

const router = Router();

// All routes require authentication
// Admin, Seller, Employee, and Customer can access all routes (for employee dashboard)
router.post("/", protect, authorize("admin", "seller", "employee", "customer"), generalRateLimit, createTask);
router.get("/", protect, authorize("admin", "seller", "employee", "customer"), generalRateLimit, getTasks);
router.get("/date/:date", protect, authorize("admin", "seller", "employee", "customer"), generalRateLimit, getTasksByDate);
router.get("/:id", protect, authorize("admin", "seller", "employee", "customer"), generalRateLimit, getTaskById);
router.put("/:id", protect, authorize("admin", "seller", "employee", "customer"), generalRateLimit, updateTask);
router.patch("/:id/toggle-status", protect, authorize("admin", "seller", "employee", "customer"), generalRateLimit, toggleTaskStatus);
router.delete("/:id", protect, authorize("admin", "seller", "employee", "customer"), generalRateLimit, deleteTask);

export default router;

