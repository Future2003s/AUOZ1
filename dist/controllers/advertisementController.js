"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleAdvertisement = exports.deleteAdvertisement = exports.updateAdvertisement = exports.createAdvertisement = exports.getAdvertisementById = exports.getAllAdvertisements = exports.getActiveAdvertisement = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const Advertisement_1 = require("../models/Advertisement");
const AppError_1 = require("../utils/AppError");
// @desc    Get active advertisement (public)
// @route   GET /api/v1/advertisements/active
// @access  Public
exports.getActiveAdvertisement = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const now = new Date();
    const userRole = req.user?.role;
    const locale = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'vi';
    // Tìm quảng cáo đang active
    const andConditions = [
        {
            $or: [
                { startDate: { $exists: false } },
                { startDate: { $lte: now } }
            ]
        },
        {
            $or: [
                { endDate: { $exists: false } },
                { endDate: { $gte: now } }
            ]
        }
    ];
    // Lọc theo target audience nếu có
    if (userRole) {
        andConditions.push({
            $or: [
                { 'targetAudience.roles': { $exists: false } },
                { 'targetAudience.roles': { $size: 0 } },
                { 'targetAudience.roles': userRole }
            ]
        });
    }
    const query = {
        enabled: true,
        ...(andConditions.length > 0 ? { $and: andConditions } : {})
    };
    const advertisement = await Advertisement_1.Advertisement.findOne(query)
        .sort({ priority: -1, createdAt: -1 })
        .lean();
    if (!advertisement) {
        return response_1.ResponseHandler.success(res, null, "No active advertisement found");
    }
    // Kiểm tra locale nếu có target
    if (advertisement.targetAudience?.locales && advertisement.targetAudience.locales.length > 0) {
        if (!advertisement.targetAudience.locales.includes(locale)) {
            return response_1.ResponseHandler.success(res, null, "No active advertisement for this locale");
        }
    }
    response_1.ResponseHandler.success(res, advertisement, "Active advertisement retrieved successfully");
});
// @desc    Get all advertisements (admin)
// @route   GET /api/v1/advertisements
// @access  Private/Admin
exports.getAllAdvertisements = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const advertisements = await Advertisement_1.Advertisement.find()
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await Advertisement_1.Advertisement.countDocuments();
    response_1.ResponseHandler.success(res, {
        advertisements,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    }, "Advertisements retrieved successfully");
});
// @desc    Get single advertisement by ID (admin)
// @route   GET /api/v1/advertisements/:id
// @access  Private/Admin
exports.getAdvertisementById = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const advertisement = await Advertisement_1.Advertisement.findById(id).lean();
    if (!advertisement) {
        return next(new AppError_1.AppError("Advertisement not found", 404));
    }
    response_1.ResponseHandler.success(res, advertisement, "Advertisement retrieved successfully");
});
// @desc    Create new advertisement (admin)
// @route   POST /api/v1/advertisements
// @access  Private/Admin
exports.createAdvertisement = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const advertisement = await Advertisement_1.Advertisement.create({
        ...req.body,
        createdBy: userId,
        updatedBy: userId
    });
    response_1.ResponseHandler.success(res, advertisement.toObject(), "Advertisement created successfully", 201);
});
// @desc    Update advertisement (admin)
// @route   PUT /api/v1/advertisements/:id
// @access  Private/Admin
exports.updateAdvertisement = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const advertisement = await Advertisement_1.Advertisement.findByIdAndUpdate(id, {
        ...req.body,
        updatedBy: userId
    }, { new: true, runValidators: true }).lean();
    if (!advertisement) {
        return next(new AppError_1.AppError("Advertisement not found", 404));
    }
    response_1.ResponseHandler.success(res, advertisement, "Advertisement updated successfully");
});
// @desc    Delete advertisement (admin)
// @route   DELETE /api/v1/advertisements/:id
// @access  Private/Admin
exports.deleteAdvertisement = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const advertisement = await Advertisement_1.Advertisement.findByIdAndDelete(id);
    if (!advertisement) {
        return next(new AppError_1.AppError("Advertisement not found", 404));
    }
    response_1.ResponseHandler.success(res, null, "Advertisement deleted successfully");
});
// @desc    Toggle advertisement enabled status (admin)
// @route   PATCH /api/v1/advertisements/:id/toggle
// @access  Private/Admin
exports.toggleAdvertisement = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const advertisement = await Advertisement_1.Advertisement.findById(id);
    if (!advertisement) {
        return next(new AppError_1.AppError("Advertisement not found", 404));
    }
    advertisement.enabled = !advertisement.enabled;
    advertisement.updatedBy = userId;
    await advertisement.save();
    response_1.ResponseHandler.success(res, advertisement.toObject(), `Advertisement ${advertisement.enabled ? 'enabled' : 'disabled'} successfully`);
});
