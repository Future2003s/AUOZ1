"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNuocCotVai100Product = exports.uploadProductImage = exports.getProductsByBrand = exports.getProductsByCategory = exports.updateProductStock = exports.searchProducts = exports.getFeaturedProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const productService_1 = require("../services/productService");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const eventService_1 = require("../services/eventService");
const performance_1 = require("../utils/performance");
const cloudinary_1 = require("../utils/cloudinary");
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page, limit, sort, order, category, brand, minPrice, maxPrice, tags, status, isVisible, isFeatured, onSale, inStock, search } = req.query;
    const filters = {
        category: category,
        brand: brand,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        tags: tags ? tags.split(",") : undefined,
        status: status,
        isVisible: isVisible ? isVisible === "true" : undefined,
        isFeatured: isFeatured ? isFeatured === "true" : undefined,
        onSale: onSale ? onSale === "true" : undefined,
        inStock: inStock ? inStock === "true" : undefined,
        search: search
    };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await productService_1.ProductService.getProducts(filters, query);
    response_1.ResponseHandler.paginated(res, result.products, result.pagination.page, result.pagination.limit, result.pagination.total, "Products retrieved successfully");
});
// @desc    Get single product by ID or slug
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const startTime = performance.now();
    const identifier = req.params.id;
    // Check if identifier is a valid MongoDB ObjectId (exactly 24 hex characters)
    // ObjectId format: 24 hexadecimal characters, no dashes or other characters
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    const isObjectId = objectIdPattern.test(identifier);
    // Log for debugging
    logger_1.logger.debug(`getProduct called with identifier: "${identifier}", isObjectId: ${isObjectId}`);
    let product;
    try {
        if (isObjectId) {
            // It's an ID, use getProductById
            logger_1.logger.debug(`Using getProductById for: ${identifier}`);
            product = await productService_1.ProductService.getProductById(identifier);
        }
        else {
            // It's a slug (or invalid format), use getProductBySlug
            // getProductBySlug will handle validation and throw appropriate error
            logger_1.logger.debug(`Using getProductBySlug for: ${identifier}`);
            product = await productService_1.ProductService.getProductBySlug(identifier);
        }
    }
    catch (error) {
        // If getProductBySlug fails and it might be an ID format issue, provide better error
        if (error.message?.includes("Cast to ObjectId")) {
            logger_1.logger.error(`Cast to ObjectId error for identifier: "${identifier}". This should not happen if routing is correct.`);
            throw new AppError_1.AppError(`Invalid product identifier: "${identifier}". Use a valid ObjectId or product slug.`, 400);
        }
        throw error;
    }
    // Track product view event
    const productId = product._id?.toString() || product.id?.toString();
    if (productId) {
        await eventService_1.eventService.emitProductEvent({
            productId,
            action: "view",
            userId: req.user?.id,
            sessionId: req.sessionId,
            metadata: {
                userAgent: req.get("User-Agent"),
                ip: req.ip,
                referrer: req.get("Referrer")
            }
        });
    }
    // Track performance
    const responseTime = performance.now() - startTime;
    performance_1.performanceMonitor.recordRequest(responseTime);
    response_1.ResponseHandler.success(res, product, "Product retrieved successfully");
});
// @desc    Create product
// @route   POST /api/v1/products
// @access  Private (Admin/Seller)
exports.createProduct = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const product = await productService_1.ProductService.createProduct(req.body, req.user.id);
    response_1.ResponseHandler.created(res, product, "Product created successfully");
});
// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Admin/Seller)
exports.updateProduct = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id || req.user?._id;
    const product = await productService_1.ProductService.updateProduct(req.params.id, req.body, userId ? String(userId) : undefined);
    response_1.ResponseHandler.success(res, product, "Product updated successfully");
});
// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin/Seller)
exports.deleteProduct = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    await productService_1.ProductService.deleteProduct(req.params.id);
    response_1.ResponseHandler.success(res, null, "Product deleted successfully");
});
// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
exports.getFeaturedProducts = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const products = await productService_1.ProductService.getFeaturedProducts(limit);
    response_1.ResponseHandler.success(res, products, "Featured products retrieved successfully");
});
// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Public
exports.searchProducts = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { q: searchTerm, ...otherQuery } = req.query;
    if (!searchTerm) {
        return response_1.ResponseHandler.badRequest(res, "Search term is required");
    }
    const filters = {
        category: otherQuery.category,
        brand: otherQuery.brand,
        minPrice: otherQuery.minPrice ? parseFloat(otherQuery.minPrice) : undefined,
        maxPrice: otherQuery.maxPrice ? parseFloat(otherQuery.maxPrice) : undefined,
        tags: otherQuery.tags ? otherQuery.tags.split(",") : undefined,
        status: otherQuery.status,
        isVisible: otherQuery.isVisible ? otherQuery.isVisible === "true" : undefined,
        isFeatured: otherQuery.isFeatured ? otherQuery.isFeatured === "true" : undefined,
        onSale: otherQuery.onSale ? otherQuery.onSale === "true" : undefined,
        inStock: otherQuery.inStock ? otherQuery.inStock === "true" : undefined
    };
    const query = {
        page: otherQuery.page ? parseInt(otherQuery.page) : undefined,
        limit: otherQuery.limit ? parseInt(otherQuery.limit) : undefined,
        sort: otherQuery.sort,
        order: otherQuery.order
    };
    const result = await productService_1.ProductService.searchProducts(searchTerm, filters, query);
    response_1.ResponseHandler.paginated(res, result.products, result.pagination.page, result.pagination.limit, result.pagination.total, `Search results for "${searchTerm}"`);
});
// @desc    Update product stock
// @route   PUT /api/v1/products/:id/stock
// @access  Private (Admin/Seller)
exports.updateProductStock = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { quantity } = req.body;
    if (quantity === undefined || quantity < 0) {
        return response_1.ResponseHandler.badRequest(res, "Valid quantity is required");
    }
    const product = await productService_1.ProductService.updateStock(req.params.id, quantity);
    response_1.ResponseHandler.success(res, product, "Product stock updated successfully");
});
// @desc    Get products by category
// @route   GET /api/v1/products/category/:categoryId
// @access  Public
exports.getProductsByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { categoryId } = req.params;
    const { page, limit, sort, order } = req.query;
    const filters = { category: categoryId };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await productService_1.ProductService.getProducts(filters, query);
    response_1.ResponseHandler.paginated(res, result.products, result.pagination.page, result.pagination.limit, result.pagination.total, "Products by category retrieved successfully");
});
// @desc    Get products by brand
// @route   GET /api/v1/products/brand/:brandId
// @access  Public
exports.getProductsByBrand = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { brandId } = req.params;
    const { page, limit, sort, order } = req.query;
    const filters = { brand: brandId };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort,
        order: order
    };
    const result = await productService_1.ProductService.getProducts(filters, query);
    response_1.ResponseHandler.paginated(res, result.products, result.pagination.page, result.pagination.limit, result.pagination.total, "Products by brand retrieved successfully");
});
// @desc    Upload product image
// @route   POST /api/v1/products/images
// @access  Private (Admin/Seller)
exports.uploadProductImage = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const file = req.file;
    if (!file) {
        return next(new AppError_1.AppError("No file uploaded", 400));
    }
    // Generate unique public_id
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const publicId = `products/${timestamp}-${randomId}`;
    // Upload to Cloudinary with product image transformations
    const cloudinaryResult = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, {
        folder: "products",
        public_id: publicId,
        transformation: [
            { width: 1200, height: 1200, crop: "limit" }, // Max size, maintain aspect ratio
            { quality: "auto", fetch_format: "auto" },
        ],
    });
    response_1.ResponseHandler.success(res, { url: cloudinaryResult.secure_url, public_id: cloudinaryResult.public_id }, "Product image uploaded successfully");
});
// @desc    Get "Nước Cốt Vải 100% Thanh Hà" product (dedicated endpoint for OrderFe)
// @route   GET /api/v1/products/nuoc-cot-vai-100
// @access  Public
exports.getNuocCotVai100Product = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const product = await productService_1.ProductService.getNuocCotVai100Product();
    response_1.ResponseHandler.success(res, product, "Nước Cốt Vải 100% Thanh Hà product retrieved successfully");
});
