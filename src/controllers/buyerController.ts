import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { Buyer } from "../models/Buyer";

// @desc    Get all buyers
// @route   GET /api/v1/buyers
// @access  Private (Employee/Admin)
export const getAllBuyers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    const query: any = {};

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    const skip = (page - 1) * limit;

    const buyers = await Buyer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Buyer.countDocuments(query);

    ResponseHandler.paginated(res, buyers, page, limit, total, "Buyers retrieved successfully");
});

// @desc    Get buyer by ID
// @route   GET /api/v1/buyers/:id
// @access  Private (Employee/Admin)
export const getBuyer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const buyer = await Buyer.findById(id).lean();

    if (!buyer) {
        return next(new AppError("Buyer not found", 404));
    }

    ResponseHandler.success(res, buyer, "Buyer retrieved successfully");
});

// @desc    Create buyer
// @route   POST /api/v1/buyers
// @access  Private (Employee/Admin)
export const createBuyer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, phone, email, address, notes } = req.body;

    if (!name || !name.trim()) {
        return next(new AppError("Buyer name is required", 400));
    }

    const buyer = await Buyer.create({
        name: name.trim(),
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
        address: address?.trim() || undefined,
        notes: notes?.trim() || undefined,
    });

    ResponseHandler.created(res, buyer, "Buyer created successfully");
});

// @desc    Update buyer
// @route   PUT /api/v1/buyers/:id
// @access  Private (Employee/Admin)
export const updateBuyer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, phone, email, address, notes } = req.body;

    const buyer = await Buyer.findById(id);

    if (!buyer) {
        return next(new AppError("Buyer not found", 404));
    }

    if (name) buyer.name = name.trim();
    if (phone !== undefined) buyer.phone = phone?.trim() || undefined;
    if (email !== undefined) buyer.email = email?.trim() || undefined;
    if (address !== undefined) buyer.address = address?.trim() || undefined;
    if (notes !== undefined) buyer.notes = notes?.trim() || undefined;

    await buyer.save();

    ResponseHandler.success(res, buyer, "Buyer updated successfully");
});

// @desc    Delete buyer
// @route   DELETE /api/v1/buyers/:id
// @access  Private (Admin only)
export const deleteBuyer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const buyer = await Buyer.findByIdAndDelete(id);

    if (!buyer) {
        return next(new AppError("Buyer not found", 404));
    }

    ResponseHandler.success(res, null, "Buyer deleted successfully");
});

