"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noValidation = exports.validateLogin = exports.validateRegister = exports.validateUpdateReview = exports.validateReview = exports.validateUpdateCategory = exports.validateCategory = exports.validateProductId = exports.validateUpdateProduct = exports.validateCreateProduct = void 0;
// Simple working validation middleware for Postman testing
const validateCreateProduct = (req, res, next) => {
    console.log("🔍 Product validation running...");
    console.log("📝 Request body:", req.body);
    const { name, price, sku, category } = req.body;
    const errors = [];
    // Check name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        errors.push({
            field: "name",
            message: "Product name must be at least 2 characters long"
        });
    }
    // Check price
    if (!price || isNaN(price) || parseFloat(price) < 0) {
        errors.push({
            field: "price",
            message: "Price must be a positive number"
        });
    }
    // Check SKU
    if (!sku || typeof sku !== "string" || sku.trim().length === 0) {
        errors.push({
            field: "sku",
            message: "SKU is required"
        });
    }
    // Require valid category (Mongo ObjectId)
    const isValidObjectId = (val) => typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);
    const isTestCategory = (val) => typeof val === "string" && val.startsWith("cat_test_");
    if (!category) {
        errors.push({
            field: "category",
            message: "Category is required"
        });
    }
    else if (!isValidObjectId(category) && !isTestCategory(category)) {
        errors.push({
            field: "category",
            message: "Valid category (24-char ObjectId) is required"
        });
    }
    if (errors.length > 0) {
        console.log("❌ Validation errors found:", errors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }
    console.log("✅ Product validation passed");
    next();
};
exports.validateCreateProduct = validateCreateProduct;
const validateUpdateProduct = (req, res, next) => {
    console.log("🔍 Product update validation running...");
    console.log("📝 Request body:", req.body);
    const { name, price, sku } = req.body;
    const errors = [];
    // Check name if provided
    if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length < 2) {
            errors.push({
                field: "name",
                message: "Product name must be at least 2 characters long"
            });
        }
    }
    // Check price if provided
    if (price !== undefined) {
        if (isNaN(price) || parseFloat(price) < 0) {
            errors.push({
                field: "price",
                message: "Price must be a positive number"
            });
        }
    }
    // Check SKU if provided
    if (sku !== undefined) {
        if (typeof sku !== "string" || sku.trim().length === 0) {
            errors.push({
                field: "sku",
                message: "SKU cannot be empty"
            });
        }
    }
    if (errors.length > 0) {
        console.log("❌ Update validation errors found:", errors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }
    console.log("✅ Product update validation passed");
    next();
};
exports.validateUpdateProduct = validateUpdateProduct;
const validateProductId = (req, res, next) => {
    const { id } = req.params;
    if (!id || id.length !== 24) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID",
            errors: [
                {
                    field: "id",
                    message: "Product ID must be a valid MongoDB ID (24 characters)"
                }
            ]
        });
    }
    next();
};
exports.validateProductId = validateProductId;
const validateCategory = (req, res, next) => {
    console.log("🔍 Category validation running...");
    console.log("📝 Request body:", req.body);
    const { name, description } = req.body;
    const errors = [];
    // Check name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        errors.push({
            field: "name",
            message: "Category name must be at least 2 characters long"
        });
    }
    // Check description if provided
    if (description !== undefined && description !== null) {
        if (typeof description !== "string" || description.trim().length > 500) {
            errors.push({
                field: "description",
                message: "Description cannot exceed 500 characters"
            });
        }
    }
    if (errors.length > 0) {
        console.log("❌ Category validation errors found:", errors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }
    console.log("✅ Category validation passed");
    next();
};
exports.validateCategory = validateCategory;
const validateUpdateCategory = (req, res, next) => {
    console.log("🔍 Category update validation running...");
    console.log("📝 Request body:", req.body);
    const { name, description } = req.body;
    const errors = [];
    // Validate name if provided
    if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length < 2) {
            errors.push({
                field: "name",
                message: "Category name must be at least 2 characters long"
            });
        }
    }
    // Validate description if provided
    if (description !== undefined && description !== null) {
        if (typeof description !== "string" || description.trim().length > 500) {
            errors.push({
                field: "description",
                message: "Description cannot exceed 500 characters"
            });
        }
    }
    if (errors.length > 0) {
        console.log("❌ Category update validation errors found:", errors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }
    console.log("✅ Category update validation passed");
    next();
};
exports.validateUpdateCategory = validateUpdateCategory;
const validateReview = (req, res, next) => {
    console.log("🔍 Review validation running...");
    console.log("📝 Request body:", req.body);
    const { rating, productId, comment } = req.body;
    const errors = [];
    // Check rating
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        errors.push({
            field: "rating",
            message: "Rating must be between 1 and 5"
        });
    }
    // Check productId
    if (!productId || typeof productId !== "string" || productId.length !== 24) {
        errors.push({
            field: "productId",
            message: "Valid product ID is required (24 characters)"
        });
    }
    // Check comment if provided
    if (comment !== undefined && comment !== null) {
        if (typeof comment !== "string" || comment.trim().length > 1000) {
            errors.push({
                field: "comment",
                message: "Comment cannot exceed 1000 characters"
            });
        }
    }
    if (errors.length > 0) {
        console.log("❌ Review validation errors found:", errors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }
    console.log("✅ Review validation passed");
    next();
};
exports.validateReview = validateReview;
const validateUpdateReview = (req, res, next) => {
    console.log("🔍 Review update validation running...");
    console.log("📝 Request body:", req.body);
    const { rating, productId, comment } = req.body;
    const errors = [];
    // Validate rating if provided
    if (rating !== undefined) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            errors.push({
                field: "rating",
                message: "Rating must be between 1 and 5"
            });
        }
    }
    // Validate productId if provided
    if (productId !== undefined) {
        if (typeof productId !== "string" || productId.length !== 24) {
            errors.push({
                field: "productId",
                message: "Valid product ID is required (24 characters)"
            });
        }
    }
    // Validate comment if provided
    if (comment !== undefined && comment !== null) {
        if (typeof comment !== "string" || comment.trim().length > 1000) {
            errors.push({
                field: "comment",
                message: "Comment cannot exceed 1000 characters"
            });
        }
    }
    if (errors.length > 0) {
        console.log("❌ Review update validation errors found:", errors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }
    console.log("✅ Review update validation passed");
    next();
};
exports.validateUpdateReview = validateUpdateReview;
const validateRegister = (req, res, next) => {
    console.log("🔍 Register validation running...");
    console.log("📝 Request body:", req.body);
    const { firstName, lastName, email, password } = req.body;
    const errors = [];
    // Check firstName
    if (!firstName || typeof firstName !== "string" || firstName.trim().length < 2) {
        errors.push({
            field: "firstName",
            message: "First name must be at least 2 characters long"
        });
    }
    // Check lastName
    if (!lastName || typeof lastName !== "string" || lastName.trim().length < 2) {
        errors.push({
            field: "lastName",
            message: "Last name must be at least 2 characters long"
        });
    }
    // Check email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push({
            field: "email",
            message: "Please provide a valid email address"
        });
    }
    // Check password
    if (!password || typeof password !== "string" || password.length < 6) {
        errors.push({
            field: "password",
            message: "Password must be at least 6 characters long"
        });
    }
    if (errors.length > 0) {
        console.log("❌ Register validation errors found:", errors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }
    console.log("✅ Register validation passed");
    next();
};
exports.validateRegister = validateRegister;
const validateLogin = (req, res, next) => {
    console.log("🔍 Login validation running...");
    console.log("📝 Request body:", req.body);
    const { email, password } = req.body;
    const errors = [];
    // Check email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push({
            field: "email",
            message: "Please provide a valid email address"
        });
    }
    // Check password
    if (!password || typeof password !== "string") {
        errors.push({
            field: "password",
            message: "Password is required"
        });
    }
    if (errors.length > 0) {
        console.log("❌ Login validation errors found:", errors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }
    console.log("✅ Login validation passed");
    next();
};
exports.validateLogin = validateLogin;
// No validation - just pass through
const noValidation = (req, res, next) => {
    next();
};
exports.noValidation = noValidation;
