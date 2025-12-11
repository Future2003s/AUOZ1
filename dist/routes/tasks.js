"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const taskController_1 = require("../controllers/taskController");
const router = (0, express_1.Router)();
// All routes require authentication
// Admin, Seller, Employee, and Customer can access all routes (for employee dashboard)
router.post("/", auth_1.protect, (0, auth_1.authorize)("admin", "seller", "employee", "customer"), rateLimiting_1.generalRateLimit, taskController_1.createTask);
router.get("/", auth_1.protect, (0, auth_1.authorize)("admin", "seller", "employee", "customer"), rateLimiting_1.generalRateLimit, taskController_1.getTasks);
router.get("/date/:date", auth_1.protect, (0, auth_1.authorize)("admin", "seller", "employee", "customer"), rateLimiting_1.generalRateLimit, taskController_1.getTasksByDate);
router.get("/:id", auth_1.protect, (0, auth_1.authorize)("admin", "seller", "employee", "customer"), rateLimiting_1.generalRateLimit, taskController_1.getTaskById);
router.put("/:id", auth_1.protect, (0, auth_1.authorize)("admin", "seller", "employee", "customer"), rateLimiting_1.generalRateLimit, taskController_1.updateTask);
router.patch("/:id/toggle-status", auth_1.protect, (0, auth_1.authorize)("admin", "seller", "employee", "customer"), rateLimiting_1.generalRateLimit, taskController_1.toggleTaskStatus);
router.delete("/:id", auth_1.protect, (0, auth_1.authorize)("admin", "seller", "employee", "customer"), rateLimiting_1.generalRateLimit, taskController_1.deleteTask);
exports.default = router;
