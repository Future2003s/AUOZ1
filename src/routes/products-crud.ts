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

import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import {
    validateCreateProduct,
    validateUpdateProduct,
    validateProductId,
    noValidation
} from "../middleware/workingValidation";
import { adminRateLimit, generalRateLimit } from "../middleware/rateLimiting";
import {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} from "../controllers/productController";

const router = Router();

/**
 * @route   GET /products
 * @desc    Get all products with pagination and filters
 * @access  Public (or Protected if needed)
 * @query   page, limit, search, category, brand, minPrice, maxPrice, tags, status, isVisible, isFeatured
 */
router.get("/", generalRateLimit, getProducts);

/**
 * @route   GET /products/:id
 * @desc    Get single product by ID or slug
 * @access  Public
 * @params  id - Product ID (ObjectId) or slug (e.g., nuoc-ep-vai-thieu)
 */
router.get("/:id", generalRateLimit, getProduct);

/**
 * @route   POST /products
 * @desc    Create new product
 * @access  Private (Admin/Seller/Employee)
 * @body    Product data (name, price, category, etc.)
 */
router.post(
    "/",
    protect,
    authorize("admin", "seller", "employee"),
    adminRateLimit,
    validateCreateProduct,
    createProduct
);

/**
 * @route   PUT /products/:id
 * @desc    Update product
 * @access  Private (Admin/Seller)
 * @params  id - Product ID (ObjectId)
 * @body    Product data to update
 */
router.put(
    "/:id",
    protect,
    authorize("admin", "seller"),
    adminRateLimit,
    validateProductId,
    validateUpdateProduct,
    updateProduct
);

/**
 * @route   DELETE /products/:id
 * @desc    Delete product
 * @access  Private (Admin/Seller)
 * @params  id - Product ID (ObjectId)
 */
router.delete(
    "/:id",
    protect,
    authorize("admin", "seller"),
    adminRateLimit,
    validateProductId,
    deleteProduct
);

export default router;
