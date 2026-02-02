"use strict";
/**
 * Products CRUD Routes
 * Dedicated routes for product management at /products
 *
 * Routes:
 * GET    /products          - List all products (with pagination, filters)
 * GET    /products/:id      - Get single product by ID or slug
 * POST   /products          - Create new product
 * PUT    /products/:id      - Update product
 * DELETE /products/:id      - Delete product
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const workingValidation_1 = require("../middleware/workingValidation");
const rateLimiting_1 = require("../middleware/rateLimiting");
const productController_1 = require("../controllers/productController");
const router = (0, express_1.Router)();
/**
 * @route   GET /products
 * @desc    Get all products with pagination and filters
 * @access  Public (or Protected if needed)
 * @query   page, limit, search, category, brand, minPrice, maxPrice, tags, status, isVisible, isFeatured
 */
router.get("/", rateLimiting_1.generalRateLimit, productController_1.getProducts);
/**
 * @route   GET /products/:id
 * @desc    Get single product by ID or slug
 * @access  Public
 * @params  id - Product ID (ObjectId) or slug (e.g., nuoc-ep-vai-thieu)
 */
router.get("/:id", rateLimiting_1.generalRateLimit, productController_1.getProduct);
/**
 * @route   POST /products
 * @desc    Create new product
 * @access  Private (Admin/Seller/Employee)
 * @body    Product data (name, price, category, etc.)
 */
router.post("/", auth_1.protect, (0, auth_1.authorize)("admin", "seller", "employee"), rateLimiting_1.adminRateLimit, workingValidation_1.validateCreateProduct, productController_1.createProduct);
/**
 * @route   PUT /products/:id
 * @desc    Update product
 * @access  Private (Admin/Seller)
 * @params  id - Product ID (ObjectId)
 * @body    Product data to update
 */
router.put("/:id", auth_1.protect, (0, auth_1.authorize)("admin", "seller"), rateLimiting_1.adminRateLimit, workingValidation_1.validateProductId, workingValidation_1.validateUpdateProduct, productController_1.updateProduct);
/**
 * @route   DELETE /products/:id
 * @desc    Delete product
 * @access  Private (Admin/Seller)
 * @params  id - Product ID (ObjectId)
 */
router.delete("/:id", auth_1.protect, (0, auth_1.authorize)("admin", "seller"), rateLimiting_1.adminRateLimit, workingValidation_1.validateProductId, productController_1.deleteProduct);
exports.default = router;
