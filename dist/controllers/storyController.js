"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishStorySettings = exports.updateStorySettings = exports.getDraftStorySettings = exports.getStorySettings = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const StorySettings_1 = require("../models/StorySettings");
// @desc    Get published story settings
// @route   GET /api/v1/story
// @access  Public
exports.getStorySettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const settings = await StorySettings_1.StorySettings.findOne({ status: "published" })
        .sort({ publishedAt: -1 })
        .lean();
    if (!settings) {
        // Return default/empty settings if none published
        return response_1.ResponseHandler.success(res, null, "No published story settings found");
    }
    return response_1.ResponseHandler.success(res, settings, "Story settings retrieved successfully");
});
// @desc    Get draft story settings (admin only)
// @route   GET /api/v1/story/draft
// @access  Private (Admin)
exports.getDraftStorySettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const settings = await StorySettings_1.StorySettings.findOne({ status: "draft" })
        .sort({ updatedAt: -1 })
        .lean();
    if (!settings) {
        return response_1.ResponseHandler.success(res, null, "No draft story settings found");
    }
    return response_1.ResponseHandler.success(res, settings, "Draft story settings retrieved successfully");
});
// @desc    Update story settings
// @route   PUT /api/v1/story
// @access  Private (Admin)
exports.updateStorySettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const updateData = req.body;
    // Find existing draft or create new one
    let settings = await StorySettings_1.StorySettings.findOne({ status: "draft" });
    if (!settings) {
        // Create new draft
        settings = await StorySettings_1.StorySettings.create({
            ...updateData,
            status: "draft",
            version: 1,
            createdBy: user?._id,
            updatedBy: user?._id,
        });
    }
    else {
        // Update existing draft
        Object.assign(settings, updateData);
        settings.updatedBy = user?._id;
        settings.version = (settings.version || 1) + 1;
        await settings.save();
    }
    return response_1.ResponseHandler.updated(res, settings, "Story settings updated successfully");
});
// @desc    Publish story settings
// @route   POST /api/v1/story/publish
// @access  Private (Admin)
exports.publishStorySettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    // Get draft settings
    const draft = await StorySettings_1.StorySettings.findOne({ status: "draft" });
    if (!draft) {
        return response_1.ResponseHandler.badRequest(res, "No draft story settings to publish");
    }
    // Update existing published to draft
    await StorySettings_1.StorySettings.updateMany({ status: "published" }, { status: "draft" });
    // Publish the draft
    draft.status = "published";
    draft.publishedAt = new Date();
    draft.updatedBy = user?._id;
    await draft.save();
    return response_1.ResponseHandler.success(res, draft, "Story settings published successfully");
});
