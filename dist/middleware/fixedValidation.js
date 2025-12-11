"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noValidation = exports.validateLogin = exports.validateRegister = exports.validateReviewId = exports.validateReview = exports.validateCategoryId = exports.validateCategory = exports.validateProductId = exports.validateUpdateProduct = exports.validateCreateProduct = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
// Handle validation errors - Fixed for express-validator v7
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => ({
            field: "path" in error ? error.path : "unknown",
            message: error.msg,
            type: error.type
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
// ===== NO VALIDATION =====
const noValidation = (req, res, next) => {
    next();
};
exports.noValidation = noValidation;
