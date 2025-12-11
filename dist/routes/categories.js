"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const workingValidation_1 = require("../middleware/workingValidation");
const categoryController_1 = require("../controllers/categoryController");
const router = (0, express_1.Router)();
// Public routes
router.get("/tree", categoryController_1.getCategoryTree);
router.get("/slug/:slug", categoryController_1.getCategoryBySlug);
router.get("/", categoryController_1.getCategories);
router.get("/:id", categoryController_1.getCategory);
// Protected routes (Admin only)
router.post("/", auth_1.protect, (0, auth_1.authorize)("admin"), workingValidation_1.validateCategory, categoryController_1.createCategory);
router.put("/:id", auth_1.protect, (0, auth_1.authorize)("admin"), workingValidation_1.validateUpdateCategory, categoryController_1.updateCategory);
router.delete("/:id", auth_1.protect, (0, auth_1.authorize)("admin"), workingValidation_1.noValidation, categoryController_1.deleteCategory);
exports.default = router;
