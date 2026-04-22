import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { PastoralImage } from "../models/PastoralImage";
import { AppError } from "../utils/AppError";

// @desc    Get all pastoral images
// @route   GET /api/v1/pastoral
// @access  Public
export const getAllPastoralImages = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { category } = req.query;

    let query: any = {};
    if (category && category !== 'all') {
        query.category = category;
    }

    const images = await PastoralImage.find(query).sort({ createdAt: -1 }).lean();

    ResponseHandler.success(res, images, "Pastoral images retrieved successfully");
});

// @desc    Create new pastoral image
// @route   POST /api/v1/pastoral
// @access  Private/Admin
export const createPastoralImage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    const image = await PastoralImage.create({
        ...req.body,
        createdBy: userId,
        updatedBy: userId
    });

    ResponseHandler.success(res, image.toObject(), "Pastoral image created successfully", 201);
});

// @desc    Update pastoral image
// @route   PUT /api/v1/pastoral/:id
// @access  Private/Admin
export const updatePastoralImage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const image = await PastoralImage.findByIdAndUpdate(
        id,
        {
            ...req.body,
            updatedBy: userId
        },
        { new: true, runValidators: true }
    ).lean();

    if (!image) {
        return next(new AppError("Pastoral image not found", 404));
    }

    ResponseHandler.success(res, image, "Pastoral image updated successfully");
});

// @desc    Delete pastoral image
// @route   DELETE /api/v1/pastoral/:id
// @access  Private/Admin
export const deletePastoralImage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const image = await PastoralImage.findByIdAndDelete(id);

    if (!image) {
        return next(new AppError("Pastoral image not found", 404));
    }

    ResponseHandler.success(res, null, "Pastoral image deleted successfully");
});
