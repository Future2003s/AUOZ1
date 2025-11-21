import { Router, Request, Response } from "express";
import { protect, authorize } from "../middleware/auth";
import { validateUserId, validateAdminAction, validatePagination } from "../middleware/unifiedValidation";
import {
    getAllUsers,
    createUser,
    updateUser,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    resetLoginAttempts,
    getLoginAttempts
} from "../controllers/userController";

const router = Router();

// All routes require admin authentication
router.use(protect, authorize("admin"));

// Dashboard stats
router.get("/dashboard", (req: Request, res: Response) => {
    res.json({ message: "Get dashboard stats - Coming soon" });
});

// User management
router.get("/users", validatePagination, getAllUsers);
router.post("/users", createUser);
router.put("/users/:id", validateUserId, updateUser);
router.put("/users/:id/role", validateUserId, updateUserRole);
router.put("/users/:id/status", validateUserId, updateUserStatus);
router.delete("/users/:id", validateUserId, deleteUser);
router.post("/users/:id/reset-login-attempts", validateUserId, resetLoginAttempts);
router.get("/users/:id/login-attempts", validateUserId, getLoginAttempts);

// Product management
router.get("/products", validatePagination, (req: Request, res: Response) => {
    res.json({ message: "Get all products (Admin) - Coming soon" });
});

// Order management
router.get("/orders", validatePagination, (req: Request, res: Response) => {
    res.json({ message: "Get all orders (Admin) - Coming soon" });
});

// Analytics
router.get("/analytics/sales", (req: Request, res: Response) => {
    res.json({ message: "Get sales analytics - Coming soon" });
});

router.get("/analytics/users", (req: Request, res: Response) => {
    res.json({ message: "Get user analytics - Coming soon" });
});

export default router;
