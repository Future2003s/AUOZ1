import { Request, Response, NextFunction } from "express";
import { ProductService } from "../services/productService";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { eventService } from "../services/eventService";
import { performanceMonitor } from "../utils/performance";
import { uploadToCloudinary } from "../utils/cloudinary";
import { AppError } from "../utils/AppError";

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
        page,
        limit,
        sort,
        order,
        category,
        brand,
        minPrice,
        maxPrice,
        tags,
        status,
        isVisible,
        isFeatured,
        onSale,
        inStock,
        search
    } = req.query;

    const filters = {
        category: category as string,
        brand: brand as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        tags: tags ? (tags as string).split(",") : undefined,
        status: status as string,
        isVisible: isVisible ? isVisible === "true" : undefined,
        isFeatured: isFeatured ? isFeatured === "true" : undefined,
        onSale: onSale ? onSale === "true" : undefined,
        inStock: inStock ? inStock === "true" : undefined,
        search: search as string
    };

    const query = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sort: sort as string,
        order: order as "asc" | "desc"
    };

    const result = await ProductService.getProducts(filters, query);

    ResponseHandler.paginated(
        res,
        result.products,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Products retrieved successfully"
    );
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
export const getProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();

    const product = await ProductService.getProductById(req.params.id);

    // Track product view event
    await eventService.emitProductEvent({
        productId: req.params.id,
        action: "view",
        userId: (req as any).user?.id,
        sessionId: (req as any).sessionId,
        metadata: {
            userAgent: req.get("User-Agent"),
            ip: req.ip,
            referrer: req.get("Referrer")
        }
    });

    // Track performance
    const responseTime = performance.now() - startTime;
    performanceMonitor.recordRequest(responseTime);

    ResponseHandler.success(res, product, "Product retrieved successfully");
});

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private (Admin/Seller)
export const createProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const product = await ProductService.createProduct(req.body, req.user.id);
    ResponseHandler.created(res, product, "Product created successfully");
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Admin/Seller)
export const updateProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const product = await ProductService.updateProduct(
        req.params.id,
        req.body,
        userId ? String(userId) : (undefined as any)
    );
    ResponseHandler.success(res, product, "Product updated successfully");
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin/Seller)
export const deleteProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await ProductService.deleteProduct(req.params.id);
    ResponseHandler.success(res, null, "Product deleted successfully");
});

// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
export const getFeaturedProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const products = await ProductService.getFeaturedProducts(limit);
    ResponseHandler.success(res, products, "Featured products retrieved successfully");
});

// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Public
export const searchProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { q: searchTerm, ...otherQuery } = req.query;

    if (!searchTerm) {
        return ResponseHandler.badRequest(res, "Search term is required");
    }

    const filters = {
        category: otherQuery.category as string,
        brand: otherQuery.brand as string,
        minPrice: otherQuery.minPrice ? parseFloat(otherQuery.minPrice as string) : undefined,
        maxPrice: otherQuery.maxPrice ? parseFloat(otherQuery.maxPrice as string) : undefined,
        tags: otherQuery.tags ? (otherQuery.tags as string).split(",") : undefined,
        status: otherQuery.status as string,
        isVisible: otherQuery.isVisible ? otherQuery.isVisible === "true" : undefined,
        isFeatured: otherQuery.isFeatured ? otherQuery.isFeatured === "true" : undefined,
        onSale: otherQuery.onSale ? otherQuery.onSale === "true" : undefined,
        inStock: otherQuery.inStock ? otherQuery.inStock === "true" : undefined
    };

    const query = {
        page: otherQuery.page ? parseInt(otherQuery.page as string) : undefined,
        limit: otherQuery.limit ? parseInt(otherQuery.limit as string) : undefined,
        sort: otherQuery.sort as string,
        order: otherQuery.order as "asc" | "desc"
    };

    const result = await ProductService.searchProducts(searchTerm as string, filters, query);

    ResponseHandler.paginated(
        res,
        result.products,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        `Search results for "${searchTerm}"`
    );
});

// @desc    Update product stock
// @route   PUT /api/v1/products/:id/stock
// @access  Private (Admin/Seller)
export const updateProductStock = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
        return ResponseHandler.badRequest(res, "Valid quantity is required");
    }

    const product = await ProductService.updateStock(req.params.id, quantity);
    ResponseHandler.success(res, product, "Product stock updated successfully");
});

// @desc    Get products by category
// @route   GET /api/v1/products/category/:categoryId
// @access  Public
export const getProductsByCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { categoryId } = req.params;
    const { page, limit, sort, order } = req.query;

    const filters = { category: categoryId };
    const query = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sort: sort as string,
        order: order as "asc" | "desc"
    };

    const result = await ProductService.getProducts(filters, query);

    ResponseHandler.paginated(
        res,
        result.products,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Products by category retrieved successfully"
    );
});

// @desc    Get products by brand
// @route   GET /api/v1/products/brand/:brandId
// @access  Public
export const getProductsByBrand = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { brandId } = req.params;
    const { page, limit, sort, order } = req.query;

    const filters = { brand: brandId };
    const query = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sort: sort as string,
        order: order as "asc" | "desc"
    };

    const result = await ProductService.getProducts(filters, query);

    ResponseHandler.paginated(
        res,
        result.products,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Products by brand retrieved successfully"
    );
});

// @desc    Upload product image
// @route   POST /api/v1/products/images
// @access  Private (Admin/Seller)
export const uploadProductImage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file as Express.Multer.File;

    if (!file) {
        return next(new AppError("No file uploaded", 400));
    }

    // Generate unique public_id
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const publicId = `products/${timestamp}-${randomId}`;

    // Upload to Cloudinary with product image transformations
    const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: "products",
        public_id: publicId,
        transformation: [
            { width: 1200, height: 1200, crop: "limit" }, // Max size, maintain aspect ratio
            { quality: "auto", fetch_format: "auto" },
        ],
    });

    ResponseHandler.success(
        res,
        { url: cloudinaryResult.secure_url, public_id: cloudinaryResult.public_id },
        "Product image uploaded successfully"
    );
});
