import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { EmployeeNavUsage } from "../models/EmployeeNavUsage";
import { AppError } from "../utils/AppError";

// @desc    Get employee nav usage for current user
// @route   GET /api/v1/employee/nav-usage
// @access  Private (ADMIN, EMPLOYEE) - guarded by employee router
export const getEmployeeNavUsage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !req.user.id) {
            return next(new AppError("User not found in request", 401));
        }

        const userId = new mongoose.Types.ObjectId(req.user.id);

        const entries = await EmployeeNavUsage.find({ userId })
            .sort({ count: -1, lastUsed: -1 })
            .lean()
            .exec();

        const data = entries.map((entry) => ({
            itemId: entry.itemId,
            count: entry.count,
            lastUsed: entry.lastUsed
        }));

        ResponseHandler.success(
            res,
            data,
            "Employee navigation usage retrieved successfully"
        );
    }
);

// @desc    Record nav usage for current user
// @route   POST /api/v1/employee/nav-usage
// @access  Private (ADMIN, EMPLOYEE) - guarded by employee router
export const recordEmployeeNavUsage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !req.user.id) {
            return next(new AppError("User not found in request", 401));
        }

        const { itemId } = req.body as { itemId?: string };

        if (!itemId || typeof itemId !== "string") {
            return ResponseHandler.badRequest(res, "itemId is required");
        }

        const userId = new mongoose.Types.ObjectId(req.user.id);

        const entry = await EmployeeNavUsage.findOneAndUpdate(
            { userId, itemId },
            {
                $inc: { count: 1 },
                $set: { lastUsed: new Date() }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        ).lean();

        const data = {
            itemId: entry.itemId,
            count: entry.count,
            lastUsed: entry.lastUsed
        };

        ResponseHandler.success(
            res,
            data,
            "Employee navigation usage recorded successfully"
        );
    }
);

