"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const workingValidation_1 = require("../middleware/workingValidation");
const rateLimiting_1 = require("../middleware/rateLimiting");
const compression_1 = require("../middleware/compression");
const productController_1 = require("../controllers/productController");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// Public routes with optimized caching and rate limiting (NO AUTHENTICATION REQUIRED)
router.get("/search", rateLimiting_1.searchRateLimit, productController_1.searchProducts);
router.get("/featured", (0, compression_1.staticDataCache)(300), productController_1.getFeaturedProducts); // Public - No auth required - Cache for 5 minutes
router.get("/category/:categoryId", (0, compression_1.staticDataCache)(600), productController_1.getProductsByCategory); // Cache for 10 minutes
router.get("/brand/:brandId", (0, compression_1.staticDataCache)(600), productController_1.getProductsByBrand); // Cache for 10 minutes
router.get("/", rateLimiting_1.generalRateLimit, productController_1.getProducts);
router.get("/:id", (0, compression_1.staticDataCache)(300), productController_1.getProduct); // Cache individual products
// Protected routes (Admin/Seller only) with rate limiting
router.post("/images", auth_1.protect, (0, auth_1.authorize)("admin", "seller"), rateLimiting_1.adminRateLimit, upload_1.uploadProductImage, productController_1.uploadProductImage);
router.post("/", auth_1.protect, (0, auth_1.authorize)("admin", "seller"), rateLimiting_1.adminRateLimit, workingValidation_1.validateCreateProduct, productController_1.createProduct);
router.put("/:id", auth_1.protect, (0, auth_1.authorize)("admin", "seller"), rateLimiting_1.adminRateLimit, workingValidation_1.validateProductId, workingValidation_1.validateUpdateProduct, productController_1.updateProduct);
router.delete("/:id", auth_1.protect, (0, auth_1.authorize)("admin", "seller"), rateLimiting_1.adminRateLimit, workingValidation_1.validateProductId, productController_1.deleteProduct);
router.put("/:id/stock", auth_1.protect, (0, auth_1.authorize)("admin", "seller"), rateLimiting_1.adminRateLimit, workingValidation_1.validateProductId, workingValidation_1.noValidation, productController_1.updateProductStock);
exports.default = router;
