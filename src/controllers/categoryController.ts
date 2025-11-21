import { Request, Response, NextFunction } from "express";
import { Category } from "../models/Category";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
export const getCategories = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { includeInactive, parent } = req.query;

    const filter: any = {};

    if (includeInactive !== "true") {
        filter.isActive = true;
    }

    if (parent) {
        filter.parent = parent === "null" ? null : parent;
    }

    const categories = await Category.find(filter).populate("parent", "name slug").sort({ sortOrder: 1, name: 1 });

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
export const getCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const category = await Category.findById(req.params.id).populate("parent", "name slug").populate("children");

    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    ResponseHandler.success(res, category, "Category retrieved successfully");
});

// @desc    Get category by slug
// @route   GET /api/v1/categories/slug/:slug
// @access  Public
export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const category = await Category.findOne({ slug: req.params.slug })
        .populate("parent", "name slug")
        .populate("children");

    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    ResponseHandler.success(res, category, "Category retrieved successfully");
});

// @desc    Create category
// @route   POST /api/v1/categories
// @access  Private (Admin)
export const createCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, slug, parent, image, icon, isActive, sortOrder, seo } = req.body;

    // Check if parent exists if provided
    if (parent) {
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
            return next(new AppError("Parent category not found", 404));
        }
    }

    // Generate slug if not provided
    const categorySlug =
        slug ||
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

    const category = await Category.create({
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

    ResponseHandler.created(res, category, "Category created successfully");
});

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private (Admin)
export const updateCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { parent } = req.body;

    // Check if parent exists if provided
    if (parent) {
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
            return next(new AppError("Parent category not found", 404));
        }

        // Prevent setting self as parent
        if (parent === req.params.id) {
            return next(new AppError("Category cannot be its own parent", 400));
        }
    }

    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).populate("parent", "name slug");

    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    ResponseHandler.success(res, category, "Category updated successfully");
});

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin)
export const deleteCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    // Check if category has products
    if (category.productCount > 0) {
        return next(new AppError("Cannot delete category with products", 400));
    }

    // Check if category has children
    const childrenCount = await Category.countDocuments({ parent: req.params.id });
    if (childrenCount > 0) {
        return next(new AppError("Cannot delete category with subcategories", 400));
    }

    await Category.findByIdAndDelete(req.params.id);

    ResponseHandler.success(res, null, "Category deleted successfully");
});

// @desc    Get category tree
// @route   GET /api/v1/categories/tree
// @access  Public
export const getCategoryTree = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });

    // Build tree structure
    const categoryMap = new Map();
    const tree: any[] = [];

    // First pass: create map of all categories
    categories.forEach((category) => {
        categoryMap.set((category._id as any).toString(), {
            ...category.toObject(),
            children: []
        });
    });

    // Second pass: build tree
    categories.forEach((category) => {
        const categoryObj = categoryMap.get((category._id as any).toString());

        if (category.parent) {
            const parent = categoryMap.get(category.parent.toString());
            if (parent) {
                parent.children.push(categoryObj);
            }
        } else {
            tree.push(categoryObj);
        }
    });

    ResponseHandler.success(res, tree, "Category tree retrieved successfully");
});
