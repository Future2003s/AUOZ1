"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noValidation = exports.simpleValidateReview = exports.simpleValidateCategory = exports.simpleValidateProduct = void 0;
// Simple validation middleware for testing
const simpleValidateProduct = (req, res, next) => {
    console.log("🔍 Simple validation running...");
    console.log("📝 Request body:", req.body);
    const { name, price, sku } = req.body;
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
    if (errors.length > 0) {
        console.log("❌ Validation errors found:", errors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors
        });
    }
    console.log("✅ Validation passed");
    next();
};
exports.simpleValidateProduct = simpleValidateProduct;
const simpleValidateCategory = (req, res, next) => {
    console.log("🔍 Simple category validation running...");
    console.log("📝 Request body:", req.body);
    const { name } = req.body;
    const errors = [];
    // Check name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        errors.push({
            field: "name",
            message: "Category name must be at least 2 characters long"
        });
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
exports.simpleValidateCategory = simpleValidateCategory;
const simpleValidateReview = (req, res, next) => {
    console.log("🔍 Simple review validation running...");
    console.log("📝 Request body:", req.body);
    const { rating, productId } = req.body;
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
            message: "Valid product ID is required"
        });
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
exports.simpleValidateReview = simpleValidateReview;
// No validation - just pass through
const noValidation = (req, res, next) => {
    next();
};
exports.noValidation = noValidation;
