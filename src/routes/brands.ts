import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { validateCreateBrand, validateUpdateBrand, validateBrandId } from "../middleware/unifiedValidation";
import {
    getBrands,
    getBrand,
    getBrandBySlug,
    createBrand,
    updateBrand,
    deleteBrand,
    getPopularBrands
} from "../controllers/brandController";

const router = Router();

// Public routes
router.get("/popular", getPopularBrands);
router.get("/slug/:slug", getBrandBySlug);
router.get("/", getBrands);
router.get("/:id", validateBrandId, getBrand);

// Protected routes (Admin only)
router.post("/", protect, authorize("admin"), validateCreateBrand, createBrand);
router.put("/:id", protect, authorize("admin"), validateBrandId, validateUpdateBrand, updateBrand);
router.delete("/:id", protect, authorize("admin"), validateBrandId, deleteBrand);

export default router;
