"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPopularBrands = exports.deleteBrand = exports.updateBrand = exports.createBrand = exports.getBrandBySlug = exports.getBrand = exports.getBrands = void 0;
const Brand_1 = require("../models/Brand");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const mongoose_1 = require("mongoose");
const slugifyName = (value) => {
    return (value
        ?.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-') || 'brand');
};
const buildSeoPayload = (payload = {}) => {
    const keywords = typeof payload.metaKeywords === 'string'
        ? payload.metaKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
        : Array.isArray(payload.metaKeywords)
            ? payload.metaKeywords
            : payload.seo?.keywords;
    return {
        title: payload.metaTitle ?? payload.seo?.title,
        description: payload.metaDescription ?? payload.seo?.description,
        keywords
    };
};
const ensureUniqueSlug = async (baseSlug, excludeId) => {
    let slug = baseSlug;
    let counter = 1;
    const buildQuery = () => {
        const query = { slug };
        if (excludeId) {
            query._id = { $ne: new mongoose_1.Types.ObjectId(excludeId) };
        }
        return query;
    };
    while (await Brand_1.Brand.exists(buildQuery())) {
        slug = `${baseSlug}-${counter++}`;
    }
    return slug;
};
// @desc    Get all brands
// @route   GET /api/v1/brands
// @access  Public
exports.getBrands = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { includeInactive, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (includeInactive !== 'true') {
        filter.isActive = true;
    }
    if (search) {
        filter.$text = { $search: search };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [brands, total] = await Promise.all([
        Brand_1.Brand.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Brand_1.Brand.countDocuments(filter)
    ]);
    // Temporary: bypass fastJSON for brands
    res.status(200).json({
        success: true,
        message: 'Brands retrieved successfully',
        data: brands,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});
// @desc    Get single brand
// @route   GET /api/v1/brands/:id
// @access  Public
exports.getBrand = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const brand = await Brand_1.Brand.findById(req.params.id);
    if (!brand) {
        return next(new AppError_1.AppError('Brand not found', 404));
    }
    response_1.ResponseHandler.success(res, brand, 'Brand retrieved successfully');
});
// @desc    Get brand by slug
// @route   GET /api/v1/brands/slug/:slug
// @access  Public
exports.getBrandBySlug = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const brand = await Brand_1.Brand.findOne({ slug: req.params.slug });
    if (!brand) {
        return next(new AppError_1.AppError('Brand not found', 404));
    }
    response_1.ResponseHandler.success(res, brand, 'Brand retrieved successfully');
});
// @desc    Create brand
// @route   POST /api/v1/brands
// @access  Private (Admin)
exports.createBrand = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { name, description, logo, website, isActive } = req.body;
    if (!name?.trim()) {
        return next(new AppError_1.AppError('Brand name is required', 400));
    }
    const baseSlug = slugifyName(name);
    const slug = await ensureUniqueSlug(baseSlug);
    const brand = await Brand_1.Brand.create({
        name: name.trim(),
        slug,
        description,
        logo,
        website,
        isActive,
        seo: buildSeoPayload(req.body)
    });
    response_1.ResponseHandler.created(res, brand, 'Brand created successfully');
});
// @desc    Update brand
// @route   PUT /api/v1/brands/:id
// @access  Private (Admin)
exports.updateBrand = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const updatePayload = { ...req.body };
    if (req.body.name?.trim()) {
        const baseSlug = slugifyName(req.body.name);
        updatePayload.slug = await ensureUniqueSlug(baseSlug, req.params.id);
        updatePayload.name = req.body.name.trim();
    }
    if (req.body.metaTitle ||
        req.body.metaDescription ||
        req.body.metaKeywords ||
        req.body.seo) {
        updatePayload.seo = buildSeoPayload(req.body);
    }
    const brand = await Brand_1.Brand.findByIdAndUpdate(req.params.id, updatePayload, {
        new: true,
        runValidators: true
    });
    if (!brand) {
        return next(new AppError_1.AppError('Brand not found', 404));
    }
    response_1.ResponseHandler.success(res, brand, 'Brand updated successfully');
});
// @desc    Delete brand
// @route   DELETE /api/v1/brands/:id
// @access  Private (Admin)
exports.deleteBrand = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const brand = await Brand_1.Brand.findById(req.params.id);
    if (!brand) {
        return next(new AppError_1.AppError('Brand not found', 404));
    }
    // Check if brand has products
    if (brand.productCount > 0) {
        return next(new AppError_1.AppError('Cannot delete brand with products', 400));
    }
    await Brand_1.Brand.findByIdAndDelete(req.params.id);
    response_1.ResponseHandler.success(res, null, 'Brand deleted successfully');
});
// @desc    Get popular brands
// @route   GET /api/v1/brands/popular
// @access  Public
exports.getPopularBrands = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { limit = 10 } = req.query;
    const brands = await Brand_1.Brand.find({ isActive: true })
        .sort({ productCount: -1 })
        .limit(parseInt(limit));
    response_1.ResponseHandler.success(res, brands, 'Popular brands retrieved successfully');
});
