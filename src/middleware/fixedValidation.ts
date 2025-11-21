import { Request, Response, NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";

// Handle validation errors - Fixed for express-validator v7
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

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

// ===== NO VALIDATION =====
export const noValidation = (req: Request, res: Response, next: NextFunction) => {
    next();
};
