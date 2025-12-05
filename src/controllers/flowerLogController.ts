import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { FlowerLog, IFlowerLog } from "../models/FlowerLog";
import { AppError } from "../utils/AppError";

// @desc    Get all flower logs
// @route   GET /api/v1/flower-logs
// @access  Public
export const getFlowerLogs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { search, from, to, page, size } = req.query;

    // Build query
    const query: any = {};

    // Date range filter
    if (from || to) {
        query.date = {};
        if (from) query.date.$gte = from as string;
        if (to) query.date.$lte = to as string;
    }

    // Search filter (search in cutter name or item types)
    if (search) {
        query.$or = [
            { cutter: { $regex: search as string, $options: 'i' } },
            { 'items.type': { $regex: search as string, $options: 'i' } }
        ];
    }

    // Pagination
    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = size ? parseInt(size as string) : 10;
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [logs, total] = await Promise.all([
        FlowerLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean()
            .exec(),
        FlowerLog.countDocuments(query)
    ]);

    // Transform _id to id for frontend compatibility
    const transformedLogs = logs.map((log: any) => ({
        id: log._id.toString(),
        cutter: log.cutter,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    }));

    ResponseHandler.paginated(
        res,
        transformedLogs,
        pageNum,
        limitNum,
        total,
        "Flower logs retrieved successfully"
    );
});

// @desc    Get single flower log
// @route   GET /api/v1/flower-logs/:id
// @access  Public
export const getFlowerLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const log = await FlowerLog.findById(id).lean().exec();

    if (!log) {
        return ResponseHandler.notFound(res, "Flower log not found");
    }

    // Transform _id to id
    const transformedLog = {
        id: (log as any)._id.toString(),
        cutter: log.cutter,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    };

    ResponseHandler.success(res, transformedLog, "Flower log retrieved successfully");
});

// @desc    Create flower log
// @route   POST /api/v1/flower-logs
// @access  Public
export const createFlowerLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { cutter, date, items, history } = req.body;

    // Validate required fields
    if (!cutter || !date || !items || !Array.isArray(items) || items.length === 0) {
        return ResponseHandler.badRequest(res, "Cutter, date, and at least one item are required");
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return ResponseHandler.badRequest(res, "Date must be in YYYY-MM-DD format");
    }

    // Create flower log
    const flowerLog = await FlowerLog.create({
        cutter,
        date,
        items,
        history: history || [`Tạo phiếu ${date}`]
    });

    // Transform _id to id
    const transformedLog = {
        id: (flowerLog._id as mongoose.Types.ObjectId).toString(),
        cutter: flowerLog.cutter,
        date: flowerLog.date,
        items: flowerLog.items,
        history: flowerLog.history,
        createdAt: flowerLog.createdAt,
        updatedAt: flowerLog.updatedAt
    };

    ResponseHandler.created(res, transformedLog, "Flower log created successfully");
});

// @desc    Update flower log
// @route   PUT /api/v1/flower-logs/:id
// @access  Public
export const updateFlowerLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { cutter, date, items, history } = req.body;

    const log = await FlowerLog.findById(id);

    if (!log) {
        return ResponseHandler.notFound(res, "Flower log not found");
    }

    // Update fields
    if (cutter !== undefined) log.cutter = cutter;
    if (date !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return ResponseHandler.badRequest(res, "Date must be in YYYY-MM-DD format");
        }
        log.date = date;
    }
    if (items !== undefined) {
        if (!Array.isArray(items) || items.length === 0) {
            return ResponseHandler.badRequest(res, "At least one item is required");
        }
        log.items = items;
    }
    if (history !== undefined) {
        log.history = Array.isArray(history) ? history : [...log.history, history];
    } else {
        // Auto-add history entry if not provided
        const today = new Date().toISOString().slice(0, 10);
        log.history.push(`Cập nhật ${today}`);
    }

    await log.save();

    // Transform _id to id
    const transformedLog = {
        id: (log._id as mongoose.Types.ObjectId).toString(),
        cutter: log.cutter,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    };

    ResponseHandler.success(res, transformedLog, "Flower log updated successfully");
});

// @desc    Delete flower log
// @route   DELETE /api/v1/flower-logs/:id
// @access  Public
export const deleteFlowerLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const log = await FlowerLog.findByIdAndDelete(id);

    if (!log) {
        return ResponseHandler.notFound(res, "Flower log not found");
    }

    ResponseHandler.deleted(res, "Flower log deleted successfully");
});

