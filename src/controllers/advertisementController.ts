import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { Advertisement } from "../models/Advertisement";
import { AppError } from "../utils/AppError";

// @desc    Get active advertisement (public)
// @route   GET /api/v1/advertisements/active
// @access  Public
export const getActiveAdvertisement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const userRole = (req as any).user?.role;
    const locale = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'vi';

    // Tìm quảng cáo đang active
    const andConditions: any[] = [
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

    const query: any = {
        enabled: true,
        ...(andConditions.length > 0 ? { $and: andConditions } : {})
    };

    const advertisement = await Advertisement.findOne(query)
        .sort({ priority: -1, createdAt: -1 })
        .lean();

    if (!advertisement) {
        return ResponseHandler.success(res, null, "No active advertisement found");
    }

    // Kiểm tra locale nếu có target
    if (advertisement.targetAudience?.locales && advertisement.targetAudience.locales.length > 0) {
        if (!advertisement.targetAudience.locales.includes(locale)) {
            return ResponseHandler.success(res, null, "No active advertisement for this locale");
        }
    }

    ResponseHandler.success(res, advertisement, "Active advertisement retrieved successfully");
});

// @desc    Get all advertisements (admin)
// @route   GET /api/v1/advertisements
// @access  Private/Admin
export const getAllAdvertisements = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const advertisements = await Advertisement.find()
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Advertisement.countDocuments();

    ResponseHandler.success(res, {
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
export const getAdvertisementById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const advertisement = await Advertisement.findById(id).lean();

    if (!advertisement) {
        return next(new AppError("Advertisement not found", 404));
    }

    ResponseHandler.success(res, advertisement, "Advertisement retrieved successfully");
});

// @desc    Create new advertisement (admin)
// @route   POST /api/v1/advertisements
// @access  Private/Admin
export const createAdvertisement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    const advertisement = await Advertisement.create({
        ...req.body,
        createdBy: userId,
        updatedBy: userId
    });

    ResponseHandler.success(res, advertisement.toObject(), "Advertisement created successfully", 201);
});

// @desc    Update advertisement (admin)
// @route   PUT /api/v1/advertisements/:id
// @access  Private/Admin
export const updateAdvertisement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const advertisement = await Advertisement.findByIdAndUpdate(
        id,
        {
            ...req.body,
            updatedBy: userId
        },
        { new: true, runValidators: true }
    ).lean();

    if (!advertisement) {
        return next(new AppError("Advertisement not found", 404));
    }

    ResponseHandler.success(res, advertisement, "Advertisement updated successfully");
});

// @desc    Delete advertisement (admin)
// @route   DELETE /api/v1/advertisements/:id
// @access  Private/Admin
export const deleteAdvertisement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const advertisement = await Advertisement.findByIdAndDelete(id);

    if (!advertisement) {
        return next(new AppError("Advertisement not found", 404));
    }

    ResponseHandler.success(res, null, "Advertisement deleted successfully");
});

// @desc    Toggle advertisement enabled status (admin)
// @route   PATCH /api/v1/advertisements/:id/toggle
// @access  Private/Admin
export const toggleAdvertisement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const advertisement = await Advertisement.findById(id);

    if (!advertisement) {
        return next(new AppError("Advertisement not found", 404));
    }

    advertisement.enabled = !advertisement.enabled;
    advertisement.updatedBy = userId;
    await advertisement.save();

    ResponseHandler.success(res, advertisement.toObject(), `Advertisement ${advertisement.enabled ? 'enabled' : 'disabled'} successfully`);
});

