"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleActivityPublished = exports.deleteActivity = exports.updateActivity = exports.createActivity = exports.getActivityByIdAdmin = exports.getAllActivitiesAdmin = exports.getActivityById = exports.getAllActivities = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const Activity_1 = require("../models/Activity");
const AppError_1 = require("../utils/AppError");
// @desc    Get all activities (public - only published)
// @route   GET /api/v1/activities
// @access  Public
exports.getAllActivities = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const query = { published: true };
    // Search functionality
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { shortDescription: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }
    const activities = await Activity_1.Activity.find(query)
        .sort({ order: -1, activityDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content') // Exclude full content for list view
        .lean();
    const total = await Activity_1.Activity.countDocuments(query);
    response_1.ResponseHandler.success(res, {
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
exports.getActivityById = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const activity = await Activity_1.Activity.findOne({ _id: id, published: true }).lean();
    if (!activity) {
        return next(new AppError_1.AppError("Activity not found", 404));
    }
    response_1.ResponseHandler.success(res, activity, "Activity retrieved successfully");
});
// @desc    Get all activities (admin - all including unpublished)
// @route   GET /api/v1/activities/admin
// @access  Private/Admin
exports.getAllActivitiesAdmin = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const published = req.query.published;
    const query = {};
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
    const activities = await Activity_1.Activity.find(query)
        .sort({ order: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await Activity_1.Activity.countDocuments(query);
    response_1.ResponseHandler.success(res, {
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
exports.getActivityByIdAdmin = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const activity = await Activity_1.Activity.findById(id).lean();
    if (!activity) {
        return next(new AppError_1.AppError("Activity not found", 404));
    }
    response_1.ResponseHandler.success(res, activity, "Activity retrieved successfully");
});
// @desc    Create new activity
// @route   POST /api/v1/activities
// @access  Private/Admin
exports.createActivity = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    const activity = await Activity_1.Activity.create({
        ...req.body,
        createdBy: userId,
        updatedBy: userId
    });
    response_1.ResponseHandler.success(res, activity, "Activity created successfully", 201);
});
// @desc    Update activity
// @route   PUT /api/v1/activities/:id
// @access  Private/Admin
exports.updateActivity = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const activity = await Activity_1.Activity.findByIdAndUpdate(id, {
        ...req.body,
        updatedBy: userId
    }, {
        new: true,
        runValidators: true
    });
    if (!activity) {
        return next(new AppError_1.AppError("Activity not found", 404));
    }
    response_1.ResponseHandler.success(res, activity, "Activity updated successfully");
});
// @desc    Delete activity
// @route   DELETE /api/v1/activities/:id
// @access  Private/Admin
exports.deleteActivity = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const activity = await Activity_1.Activity.findByIdAndDelete(id);
    if (!activity) {
        return next(new AppError_1.AppError("Activity not found", 404));
    }
    response_1.ResponseHandler.success(res, null, "Activity deleted successfully");
});
// @desc    Toggle published status
// @route   PATCH /api/v1/activities/:id/toggle
// @access  Private/Admin
exports.toggleActivityPublished = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const activity = await Activity_1.Activity.findById(id);
    if (!activity) {
        return next(new AppError_1.AppError("Activity not found", 404));
    }
    activity.published = !activity.published;
    activity.updatedBy = userId;
    await activity.save();
    response_1.ResponseHandler.success(res, activity, `Activity ${activity.published ? 'published' : 'unpublished'} successfully`);
});
