import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { StorySettings } from "../models/StorySettings";

// @desc    Get published story settings
// @route   GET /api/v1/story
// @access  Public
export const getStorySettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await StorySettings.findOne({ status: "published" })
    .sort({ publishedAt: -1 })
    .lean();

  if (!settings) {
    // Return default/empty settings if none published
    return ResponseHandler.success(res, null, "No published story settings found");
  }

  return ResponseHandler.success(res, settings, "Story settings retrieved successfully");
});

// @desc    Get draft story settings (admin only)
// @route   GET /api/v1/story/draft
// @access  Private (Admin)
export const getDraftStorySettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await StorySettings.findOne({ status: "draft" })
    .sort({ updatedAt: -1 })
    .lean();

  if (!settings) {
    return ResponseHandler.success(res, null, "No draft story settings found");
  }

  return ResponseHandler.success(res, settings, "Draft story settings retrieved successfully");
});

// @desc    Update story settings
// @route   PUT /api/v1/story
// @access  Private (Admin)
export const updateStorySettings = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const updateData = req.body;

  // Find existing draft or create new one
  let settings = await StorySettings.findOne({ status: "draft" });

  if (!settings) {
    // Create new draft
    settings = await StorySettings.create({
      ...updateData,
      status: "draft",
      version: 1,
      createdBy: user?._id,
      updatedBy: user?._id,
    });
  } else {
    // Update existing draft
    Object.assign(settings, updateData);
    settings.updatedBy = user?._id;
    settings.version = (settings.version || 1) + 1;
    await settings.save();
  }

  return ResponseHandler.updated(res, settings, "Story settings updated successfully");
});

// @desc    Publish story settings
// @route   POST /api/v1/story/publish
// @access  Private (Admin)
export const publishStorySettings = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  // Get draft settings
  const draft = await StorySettings.findOne({ status: "draft" });

  if (!draft) {
    return ResponseHandler.badRequest(res, "No draft story settings to publish");
  }

  // Update existing published to draft
  await StorySettings.updateMany(
    { status: "published" },
    { status: "draft" }
  );

  // Publish the draft
  draft.status = "published";
  draft.publishedAt = new Date();
  draft.updatedBy = user?._id;
  await draft.save();

  return ResponseHandler.success(res, draft, "Story settings published successfully");
});

