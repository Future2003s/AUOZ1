"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryTree = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryBySlug = exports.getCategory = exports.getCategories = void 0;
const Category_1 = require("../models/Category");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
exports.getCategories = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { includeInactive, parent } = req.query;
    const filter = {};
    if (includeInactive !== "true") {
        filter.isActive = true;
    }
    if (parent) {
        filter.parent = parent === "null" ? null : parent;
    }
    const categories = await Category_1.Category.find(filter).populate("parent", "name slug").sort({ sortOrder: 1, name: 1 });
    // Temporary: bypass fastJSON for categories
    res.status(200).json({
        success: true,
        message: "Categories retrieved successfully",
        data: categories,
        timestamp: new Date().toISOString()
    });
});
// @desc    Get single category
// @route   GET /api/v1/categories/:id
// @access  Public
exports.getCategory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const category = await Category_1.Category.findById(req.params.id).populate("parent", "name slug").populate("children");
    if (!category) {
        return next(new AppError_1.AppError("Category not found", 404));
    }
    response_1.ResponseHandler.success(res, category, "Category retrieved successfully");
});
// @desc    Get category by slug
// @route   GET /api/v1/categories/slug/:slug
// @access  Public
exports.getCategoryBySlug = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const category = await Category_1.Category.findOne({ slug: req.params.slug })
        .populate("parent", "name slug")
        .populate("children");
    if (!category) {
        return next(new AppError_1.AppError("Category not found", 404));
    }
    response_1.ResponseHandler.success(res, category, "Category retrieved successfully");
});
// @desc    Create category
// @route   POST /api/v1/categories
// @access  Private (Admin)
exports.createCategory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { name, description, slug, parent, image, icon, isActive, sortOrder, seo } = req.body;
    // Check if parent exists if provided
    if (parent) {
        const parentCategory = await Category_1.Category.findById(parent);
        if (!parentCategory) {
            return next(new AppError_1.AppError("Parent category not found", 404));
        }
    }
    // Generate slug if not provided
    const categorySlug = slug ||
        name
            .toLowerCase()
            .trim()
            .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
            .replace(/[èéẹẻẽêềếệểễ]/g, "e")
            .replace(/[ìíịỉĩ]/g, "i")
            .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
            .replace(/[ùúụủũưừứựửữ]/g, "u")
            .replace(/[ỳýỵỷỹ]/g, "y")
            .replace(/đ/g, "d")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    const category = await Category_1.Category.create({
        name,
        description,
        slug: categorySlug,
        parent: parent || null,
        image,
        icon,
        isActive,
        sortOrder,
        seo
    });
    await category.populate("parent", "name slug");
    response_1.ResponseHandler.created(res, category, "Category created successfully");
});
// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private (Admin)
exports.updateCategory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { parent } = req.body;
    // Check if parent exists if provided
    if (parent) {
        const parentCategory = await Category_1.Category.findById(parent);
        if (!parentCategory) {
            return next(new AppError_1.AppError("Parent category not found", 404));
        }
        // Prevent setting self as parent
        if (parent === req.params.id) {
            return next(new AppError_1.AppError("Category cannot be its own parent", 400));
        }
    }
    const category = await Category_1.Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate("parent", "name slug");
    if (!category) {
        return next(new AppError_1.AppError("Category not found", 404));
    }
    response_1.ResponseHandler.success(res, category, "Category updated successfully");
});
// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin)
exports.deleteCategory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const category = await Category_1.Category.findById(req.params.id);
    if (!category) {
        return next(new AppError_1.AppError("Category not found", 404));
    }
    // Check if category has products
    if (category.productCount > 0) {
        return next(new AppError_1.AppError("Cannot delete category with products", 400));
    }
    // Check if category has children
    const childrenCount = await Category_1.Category.countDocuments({ parent: req.params.id });
    if (childrenCount > 0) {
        return next(new AppError_1.AppError("Cannot delete category with subcategories", 400));
    }
    await Category_1.Category.findByIdAndDelete(req.params.id);
    response_1.ResponseHandler.success(res, null, "Category deleted successfully");
});
// @desc    Get category tree
// @route   GET /api/v1/categories/tree
// @access  Public
exports.getCategoryTree = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const categories = await Category_1.Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    // Build tree structure
    const categoryMap = new Map();
    const tree = [];
    // First pass: create map of all categories
    categories.forEach((category) => {
        categoryMap.set(category._id.toString(), {
            ...category.toObject(),
            children: []
        });
    });
    // Second pass: build tree
    categories.forEach((category) => {
        const categoryObj = categoryMap.get(category._id.toString());
        if (category.parent) {
            const parent = categoryMap.get(category.parent.toString());
            if (parent) {
                parent.children.push(categoryObj);
            }
        }
        else {
            tree.push(categoryObj);
        }
    });
    response_1.ResponseHandler.success(res, tree, "Category tree retrieved successfully");
});
