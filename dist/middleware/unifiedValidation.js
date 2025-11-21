"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noValidation = exports.validatePagination = exports.validateSearchQuery = exports.validateAdminAction = exports.validateCartProductId = exports.validateUpdateCartItem = exports.validateAddToCart = exports.validateBrandId = exports.validateUpdateBrand = exports.validateCreateBrand = exports.validateOrderStatus = exports.validateOrderId = exports.validateCreateOrder = exports.validateBulkTranslations = exports.validateTranslationKey = exports.validateTranslation = exports.validateUserId = exports.validateAddress = exports.validateReviewId = exports.validateReview = exports.validateCategoryId = exports.validateCategory = exports.validateResetPassword = exports.validateForgotPassword = exports.validateChangePassword = exports.validateLogin = exports.validateRegister = exports.validateProductId = exports.validateUpdateProduct = exports.validateCreateProduct = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
exports.handleValidationErrors = handleValidationErrors;
// ===== PRODUCT VALIDATION =====
exports.validateCreateProduct = [
    (0, express_validator_1.body)("name").trim().isLength({ min: 2, max: 200 }).withMessage("Product name must be between 2 and 200 characters"),
    (0, express_validator_1.body)("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    (0, express_validator_1.body)("sku").trim().notEmpty().withMessage("SKU is required"),
    exports.handleValidationErrors
];
exports.validateUpdateProduct = [
    (0, express_validator_1.body)("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage("Product name must be between 2 and 200 characters"),
    (0, express_validator_1.body)("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    (0, express_validator_1.body)("sku").optional().trim().notEmpty().withMessage("SKU cannot be empty"),
    exports.handleValidationErrors
];
exports.validateProductId = [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid product ID"), exports.handleValidationErrors];
// ===== AUTH VALIDATION =====
exports.validateRegister = [
    (0, express_validator_1.body)("firstName")
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("First name must be between 2 and 50 characters"),
    (0, express_validator_1.body)("lastName").trim().isLength({ min: 2, max: 50 }).withMessage("Last name must be between 2 and 50 characters"),
    (0, express_validator_1.body)("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    (0, express_validator_1.body)("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    exports.handleValidationErrors
];
exports.validateLogin = [
    (0, express_validator_1.body)("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"),
    exports.handleValidationErrors
];
exports.validateChangePassword = [
    (0, express_validator_1.body)("currentPassword").notEmpty().withMessage("Current password is required"),
    (0, express_validator_1.body)("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
    exports.handleValidationErrors
];
exports.validateForgotPassword = [
    (0, express_validator_1.body)("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    exports.handleValidationErrors
];
exports.validateResetPassword = [
    (0, express_validator_1.body)("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    exports.handleValidationErrors
];
// ===== CATEGORY VALIDATION =====
exports.validateCategory = [
    (0, express_validator_1.body)("name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Category name must be between 2 and 100 characters"),
    (0, express_validator_1.body)("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
    exports.handleValidationErrors
];
exports.validateCategoryId = [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid category ID"), exports.handleValidationErrors];
// ===== REVIEW VALIDATION =====
exports.validateReview = [
    (0, express_validator_1.body)("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    (0, express_validator_1.body)("productId").isMongoId().withMessage("Valid product ID is required"),
    (0, express_validator_1.body)("comment").optional().trim().isLength({ max: 1000 }).withMessage("Comment cannot exceed 1000 characters"),
    exports.handleValidationErrors
];
exports.validateReviewId = [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid review ID"), exports.handleValidationErrors];
// ===== USER VALIDATION =====
exports.validateAddress = [
    (0, express_validator_1.body)("street").trim().notEmpty().withMessage("Street address is required"),
    (0, express_validator_1.body)("city").trim().notEmpty().withMessage("City is required"),
    (0, express_validator_1.body)("state").trim().notEmpty().withMessage("State is required"),
    (0, express_validator_1.body)("zipCode").trim().notEmpty().withMessage("Zip code is required"),
    (0, express_validator_1.body)("country").trim().notEmpty().withMessage("Country is required"),
    exports.handleValidationErrors
];
exports.validateUserId = [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid user ID"), exports.handleValidationErrors];
// ===== TRANSLATION VALIDATION =====
exports.validateTranslation = [
    (0, express_validator_1.body)("key").trim().notEmpty().withMessage("Translation key is required"),
    (0, express_validator_1.body)("vi").trim().notEmpty().withMessage("Vietnamese translation is required"),
    (0, express_validator_1.body)("en").trim().notEmpty().withMessage("English translation is required"),
    exports.handleValidationErrors
];
exports.validateTranslationKey = [
    (0, express_validator_1.param)("key").trim().notEmpty().withMessage("Translation key is required"),
    exports.handleValidationErrors
];
exports.validateBulkTranslations = [
    (0, express_validator_1.body)("translations").isArray({ min: 1 }).withMessage("Translations must be a non-empty array"),
    (0, express_validator_1.body)("translations.*.key").trim().notEmpty().withMessage("Translation key is required"),
    (0, express_validator_1.body)("translations.*.vi").trim().notEmpty().withMessage("Vietnamese translation is required"),
    (0, express_validator_1.body)("translations.*.en").trim().notEmpty().withMessage("English translation is required"),
    exports.handleValidationErrors
];
// ===== ORDER VALIDATION =====
exports.validateCreateOrder = [
    (0, express_validator_1.body)("items").isArray({ min: 1 }).withMessage("Order must contain at least one item"),
    (0, express_validator_1.body)("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    (0, express_validator_1.body)("items.*.price").isFloat({ min: 0 }).withMessage("Price must be positive"),
    (0, express_validator_1.body)("items.*.name").trim().notEmpty().withMessage("Product name is required"),
    // Either shippingAddress or customer is required
    (0, express_validator_1.body)().custom((value, { req }) => {
        if (!value.shippingAddress && !value.customer) {
            throw new Error("Either shippingAddress or customer information is required");
        }
        return true;
    }),
    (0, express_validator_1.body)("paymentMethod").notEmpty().withMessage("Payment method is required"),
    exports.handleValidationErrors
];
exports.validateOrderId = [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid order ID"), exports.handleValidationErrors];
exports.validateOrderStatus = [
    (0, express_validator_1.body)("status")
        .isIn(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"])
        .withMessage("Invalid order status"),
    (0, express_validator_1.body)("notes").optional().trim().isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters"),
    exports.handleValidationErrors
];
// ===== BRAND VALIDATION =====
exports.validateCreateBrand = [
    (0, express_validator_1.body)("name").trim().isLength({ min: 2, max: 100 }).withMessage("Brand name must be between 2 and 100 characters"),
    (0, express_validator_1.body)("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
    (0, express_validator_1.body)("logo").optional().isURL().withMessage("Logo must be a valid URL"),
    exports.handleValidationErrors
];
exports.validateUpdateBrand = [
    (0, express_validator_1.body)("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Brand name must be between 2 and 100 characters"),
    (0, express_validator_1.body)("description")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters"),
    (0, express_validator_1.body)("logo").optional().isURL().withMessage("Logo must be a valid URL"),
    exports.handleValidationErrors
];
exports.validateBrandId = [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid brand ID"), exports.handleValidationErrors];
// ===== CART VALIDATION =====
exports.validateAddToCart = [
    (0, express_validator_1.body)("productId").isMongoId().withMessage("Valid product ID is required"),
    (0, express_validator_1.body)("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    exports.handleValidationErrors
];
exports.validateUpdateCartItem = [
    (0, express_validator_1.body)("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    exports.handleValidationErrors
];
exports.validateCartProductId = [
    (0, express_validator_1.param)("productId").isMongoId().withMessage("Invalid product ID"),
    exports.handleValidationErrors
];
// ===== ADMIN VALIDATION =====
exports.validateAdminAction = [
    (0, express_validator_1.body)("action").isIn(["approve", "reject", "suspend", "activate"]).withMessage("Invalid admin action"),
    (0, express_validator_1.body)("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason cannot exceed 500 characters"),
    exports.handleValidationErrors
];
// ===== SEARCH VALIDATION =====
exports.validateSearchQuery = [
    (0, express_validator_1.query)("q").trim().notEmpty().withMessage("Search query is required"),
    exports.handleValidationErrors
];
// ===== PAGINATION VALIDATION =====
exports.validatePagination = [
    (0, express_validator_1.query)("page").optional().isInt({ min: 0 }).withMessage("Page must be a non-negative integer"),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    exports.handleValidationErrors
];
// ===== NO VALIDATION =====
const noValidation = (req, res, next) => {
    next();
};
exports.noValidation = noValidation;
