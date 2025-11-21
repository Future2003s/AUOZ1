import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { Activity } from "../models/Activity";
import { AppError } from "../utils/AppError";

// @desc    Get all activities (public - only published)
// @route   GET /api/v1/activities
// @access  Public
export const getAllActivities = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const query: any = { published: true };

    // Search functionality
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { shortDescription: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    const activities = await Activity.find(query)
        .sort({ order: -1, activityDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content') // Exclude full content for list view
        .lean();

    const total = await Activity.countDocuments(query);

    ResponseHandler.success(res, {
        activities,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    }, "Activities retrieved successfully");
});

// @desc    Get activity by ID (public)
// @route   GET /api/v1/activities/:id
// @access  Public
export const getActivityById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const activity = await Activity.findOne({ _id: id, published: true }).lean();

    if (!activity) {
        return next(new AppError("Activity not found", 404));
    }

    ResponseHandler.success(res, activity, "Activity retrieved successfully");
});

// @desc    Get all activities (admin - all including unpublished)
// @route   GET /api/v1/activities/admin
// @access  Private/Admin
export const getAllActivitiesAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const published = req.query.published as string;

    const query: any = {};

    // Filter by published status
    if (published !== undefined) {
        query.published = published === 'true';
    }

    // Search functionality
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { shortDescription: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    const activities = await Activity.find(query)
        .sort({ order: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Activity.countDocuments(query);

    ResponseHandler.success(res, {
        activities,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    }, "Activities retrieved successfully");
});

// @desc    Get activity by ID (admin)
// @route   GET /api/v1/activities/admin/:id
// @access  Private/Admin
export const getActivityByIdAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const activity = await Activity.findById(id).lean();

    if (!activity) {
        return next(new AppError("Activity not found", 404));
    }

    ResponseHandler.success(res, activity, "Activity retrieved successfully");
});

// @desc    Create new activity
// @route   POST /api/v1/activities
// @access  Private/Admin
export const createActivity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    const activity = await Activity.create({
        ...req.body,
        createdBy: userId,
        updatedBy: userId
    });

    ResponseHandler.success(res, activity, "Activity created successfully", 201);
});

// @desc    Update activity
// @route   PUT /api/v1/activities/:id
// @access  Private/Admin
export const updateActivity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const activity = await Activity.findByIdAndUpdate(
        id,
        {
            ...req.body,
            updatedBy: userId
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!activity) {
        return next(new AppError("Activity not found", 404));
    }

    ResponseHandler.success(res, activity, "Activity updated successfully");
});

// @desc    Delete activity
// @route   DELETE /api/v1/activities/:id
// @access  Private/Admin
export const deleteActivity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const activity = await Activity.findByIdAndDelete(id);

    if (!activity) {
        return next(new AppError("Activity not found", 404));
    }

    ResponseHandler.success(res, null, "Activity deleted successfully");
});

// @desc    Toggle published status
// @route   PATCH /api/v1/activities/:id/toggle
// @access  Private/Admin
export const toggleActivityPublished = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const activity = await Activity.findById(id);

    if (!activity) {
        return next(new AppError("Activity not found", 404));
    }

    activity.published = !activity.published;
    activity.updatedBy = userId;
    await activity.save();

    ResponseHandler.success(res, activity, `Activity ${activity.published ? 'published' : 'unpublished'} successfully`);
});

