import { Request, Response, NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";

// Handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => ({
            field: error.type === "field" ? error.path : "unknown",
            message: error.msg
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errorMessages
        });
    }

    next();
};

// ===== PRODUCT VALIDATION =====
export const validateCreateProduct = [
    body("name").trim().isLength({ min: 2, max: 200 }).withMessage("Product name must be between 2 and 200 characters"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("sku").trim().notEmpty().withMessage("SKU is required"),
    handleValidationErrors
];

export const validateUpdateProduct = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage("Product name must be between 2 and 200 characters"),
    body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("sku").optional().trim().notEmpty().withMessage("SKU cannot be empty"),
    handleValidationErrors
];

export const validateProductId = [param("id").isMongoId().withMessage("Invalid product ID"), handleValidationErrors];

// ===== AUTH VALIDATION =====
export const validateRegister = [
    body("firstName")
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("First name must be between 2 and 50 characters"),
    body("lastName").trim().isLength({ min: 2, max: 50 }).withMessage("Last name must be between 2 and 50 characters"),
    body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    handleValidationErrors
];

export const validateLogin = [
    body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
    handleValidationErrors
];

export const validateChangePassword = [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
    handleValidationErrors
];

export const validateForgotPassword = [
    body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    handleValidationErrors
];

export const validateResetPassword = [
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    handleValidationErrors
];

// ===== CATEGORY VALIDATION =====
export const validateCategory = [
    body("name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Category name must be between 2 and 100 characters"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
    handleValidationErrors
];

export const validateCategoryId = [param("id").isMongoId().withMessage("Invalid category ID"), handleValidationErrors];

// ===== REVIEW VALIDATION =====
export const validateReview = [
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("productId").isMongoId().withMessage("Valid product ID is required"),
    body("comment").optional().trim().isLength({ max: 1000 }).withMessage("Comment cannot exceed 1000 characters"),
    handleValidationErrors
];

export const validateReviewId = [param("id").isMongoId().withMessage("Invalid review ID"), handleValidationErrors];

// ===== USER VALIDATION =====
export const validateAddress = [
    body("street").trim().notEmpty().withMessage("Street address is required"),
    body("city").trim().notEmpty().withMessage("City is required"),
    body("state").trim().notEmpty().withMessage("State is required"),
    body("zipCode").trim().notEmpty().withMessage("Zip code is required"),
    body("country").trim().notEmpty().withMessage("Country is required"),
    handleValidationErrors
];

export const validateUserId = [param("id").isMongoId().withMessage("Invalid user ID"), handleValidationErrors];

// ===== TRANSLATION VALIDATION =====
export const validateTranslation = [
    body("key").trim().notEmpty().withMessage("Translation key is required"),
    body("vi").trim().notEmpty().withMessage("Vietnamese translation is required"),
    body("en").trim().notEmpty().withMessage("English translation is required"),
    handleValidationErrors
];

export const validateTranslationKey = [
    param("key").trim().notEmpty().withMessage("Translation key is required"),
    handleValidationErrors
];

export const validateBulkTranslations = [
    body("translations").isArray({ min: 1 }).withMessage("Translations must be a non-empty array"),
    body("translations.*.key").trim().notEmpty().withMessage("Translation key is required"),
    body("translations.*.vi").trim().notEmpty().withMessage("Vietnamese translation is required"),
    body("translations.*.en").trim().notEmpty().withMessage("English translation is required"),
    handleValidationErrors
];

// ===== ORDER VALIDATION =====
export const validateCreateOrder = [
    body("items").isArray({ min: 1 }).withMessage("Order must contain at least one item"),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    body("items.*.price").isFloat({ min: 0 }).withMessage("Price must be positive"),
    body("items.*.name").trim().notEmpty().withMessage("Product name is required"),
    // Either shippingAddress or customer is required
    body().custom((value, { req }) => {
        if (!value.shippingAddress && !value.customer) {
            throw new Error("Either shippingAddress or customer information is required");
        }
        return true;
    }),
    body("paymentMethod").notEmpty().withMessage("Payment method is required"),
    handleValidationErrors
];

export const validateOrderId = [param("id").isMongoId().withMessage("Invalid order ID"), handleValidationErrors];

export const validateOrderStatus = [
    body("status")
        .isIn(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"])
        .withMessage("Invalid order status"),
    body("notes").optional().trim().isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters"),
    handleValidationErrors
];

// ===== BRAND VALIDATION =====
export const validateCreateBrand = [
    body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Brand name must be between 2 and 100 characters"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
    body("logo").optional().isURL().withMessage("Logo must be a valid URL"),
    handleValidationErrors
];

export const validateUpdateBrand = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Brand name must be between 2 and 100 characters"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
    body("logo").optional().isURL().withMessage("Logo must be a valid URL"),
    handleValidationErrors
];

export const validateBrandId = [param("id").isMongoId().withMessage("Invalid brand ID"), handleValidationErrors];

// ===== CART VALIDATION =====
export const validateAddToCart = [
    body("productId").isMongoId().withMessage("Valid product ID is required"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    handleValidationErrors
];

export const validateUpdateCartItem = [
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    handleValidationErrors
];

export const validateCartProductId = [
    param("productId").isMongoId().withMessage("Invalid product ID"),
    handleValidationErrors
];

// ===== ADMIN VALIDATION =====
export const validateAdminAction = [
    body("action").isIn(["approve", "reject", "suspend", "activate"]).withMessage("Invalid admin action"),
    body("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason cannot exceed 500 characters"),
    handleValidationErrors
];

// ===== SEARCH VALIDATION =====
export const validateSearchQuery = [
    query("q").trim().notEmpty().withMessage("Search query is required"),
    handleValidationErrors
];

// ===== PAGINATION VALIDATION =====
export const validatePagination = [
    query("page").optional().isInt({ min: 0 }).withMessage("Page must be a non-negative integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    handleValidationErrors
];

// ===== NO VALIDATION =====
export const noValidation = (req: Request, res: Response, next: NextFunction) => {
    next();
};
