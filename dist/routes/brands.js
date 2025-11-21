"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const unifiedValidation_1 = require("../middleware/unifiedValidation");
const brandController_1 = require("../controllers/brandController");
const router = (0, express_1.Router)();
// Public routes
router.get("/popular", brandController_1.getPopularBrands);
router.get("/slug/:slug", brandController_1.getBrandBySlug);
router.get("/", brandController_1.getBrands);
router.get("/:id", unifiedValidation_1.validateBrandId, brandController_1.getBrand);
// Protected routes (Admin only)
router.post("/", auth_1.protect, (0, auth_1.authorize)("admin"), unifiedValidation_1.validateCreateBrand, brandController_1.createBrand);
router.put("/:id", auth_1.protect, (0, auth_1.authorize)("admin"), unifiedValidation_1.validateBrandId, unifiedValidation_1.validateUpdateBrand, brandController_1.updateBrand);
router.delete("/:id", auth_1.protect, (0, auth_1.authorize)("admin"), unifiedValidation_1.validateBrandId, brandController_1.deleteBrand);
exports.default = router;
