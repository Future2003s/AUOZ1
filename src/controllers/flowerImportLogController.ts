import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { FlowerImportLog, IFlowerImportLog } from "../models/FlowerImportLog";
import { AppError } from "../utils/AppError";

// @desc    Get all flower import logs
// @route   GET /api/v1/flower-imports
// @access  Public
export const getFlowerImportLogs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { search, from, to, page, size } = req.query;

    // Build query
    const query: any = {};

    // Date range filter
    if (from || to) {
        query.date = {};
        if (from) query.date.$gte = from as string;
        if (to) query.date.$lte = to as string;
    }

    // Search filter (search in importer name or item types)
    if (search) {
        query.$or = [
            { importer: { $regex: search as string, $options: 'i' } },
            { 'items.type': { $regex: search as string, $options: 'i' } }
        ];
    }

    // Pagination
    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = size ? parseInt(size as string) : 10;
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [logs, total] = await Promise.all([
        FlowerImportLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean()
            .exec(),
        FlowerImportLog.countDocuments(query)
    ]);

    // Transform _id to id for frontend compatibility
    const transformedLogs = logs.map((log: any) => ({
        id: log._id.toString(),
        importer: log.importer,
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
        "Flower import logs retrieved successfully"
    );
});

// @desc    Get single flower import log
// @route   GET /api/v1/flower-imports/:id
// @access  Public
export const getFlowerImportLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const log = await FlowerImportLog.findById(id).lean().exec();

    if (!log) {
        return ResponseHandler.notFound(res, "Flower import log not found");
    }

    // Transform _id to id
    const transformedLog = {
        id: (log as any)._id.toString(),
        importer: log.importer,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    };

    ResponseHandler.success(res, transformedLog, "Flower import log retrieved successfully");
});

// @desc    Create flower import log
// @route   POST /api/v1/flower-imports
// @access  Public
export const createFlowerImportLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { importer, date, items, history } = req.body;

    // Validate required fields
    if (!importer || !date || !items || !Array.isArray(items) || items.length === 0) {
        return ResponseHandler.badRequest(res, "Importer, date, and at least one item are required");
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return ResponseHandler.badRequest(res, "Date must be in YYYY-MM-DD format");
    }

    // Create flower import log
    const flowerLog = await FlowerImportLog.create({
        importer,
        date,
        items,
        history: history || [`Tạo phiếu ${date}`]
    });

    // Transform _id to id
    const transformedLog = {
        id: (flowerLog._id as mongoose.Types.ObjectId).toString(),
        importer: flowerLog.importer,
        date: flowerLog.date,
        items: flowerLog.items,
        history: flowerLog.history,
        createdAt: flowerLog.createdAt,
        updatedAt: flowerLog.updatedAt
    };

    ResponseHandler.created(res, transformedLog, "Flower import log created successfully");
});

// @desc    Update flower import log
// @route   PUT /api/v1/flower-imports/:id
// @access  Public
export const updateFlowerImportLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { importer, date, items, history } = req.body;

    const log = await FlowerImportLog.findById(id);

    if (!log) {
        return ResponseHandler.notFound(res, "Flower import log not found");
    }

    // Update fields
    if (importer !== undefined) log.importer = importer;
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
        importer: log.importer,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    };

    ResponseHandler.success(res, transformedLog, "Flower import log updated successfully");
});

// @desc    Delete flower import log
// @route   DELETE /api/v1/flower-imports/:id
// @access  Public
export const deleteFlowerImportLog = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const log = await FlowerImportLog.findByIdAndDelete(id);

    if (!log) {
        return ResponseHandler.notFound(res, "Flower import log not found");
    }

    ResponseHandler.deleted(res, "Flower import log deleted successfully");
});
