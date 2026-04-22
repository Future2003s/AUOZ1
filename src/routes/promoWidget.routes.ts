import { Router } from "express";
import {
    getPromoWidgets,
    getPromoWidgetById,
    createPromoWidget,
    updatePromoWidget,
    deletePromoWidget,
    toggleActive
} from "../controllers/promoWidget.controller";
import { protect, authorize } from "../middleware/auth"; // Assuming standard auth middleware

const router = Router();

// Public routes
router.get("/", getPromoWidgets);
router.get("/:id", getPromoWidgetById);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize("admin", "admin-root")); // common pattern for roles

router.post("/", createPromoWidget);
router.put("/:id", updatePromoWidget);
router.patch("/:id/toggle-active", toggleActive);
router.delete("/:id", deletePromoWidget);

export default router;
