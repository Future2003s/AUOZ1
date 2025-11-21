import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { validateCategory, validateUpdateCategory, noValidation } from "../middleware/workingValidation";
import {
    getCategories,
    getCategory,
    getCategoryBySlug,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryTree
} from "../controllers/categoryController";

const router = Router();

// Public routes
router.get("/tree", getCategoryTree);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/", getCategories);
router.get("/:id", getCategory);

// Protected routes (Admin only)
router.post("/", protect, authorize("admin"), validateCategory, createCategory);
router.put("/:id", protect, authorize("admin"), validateUpdateCategory, updateCategory);
router.delete("/:id", protect, authorize("admin"), noValidation, deleteCategory);

export default router;
