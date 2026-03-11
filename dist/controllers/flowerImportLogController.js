"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFlowerImportLog = exports.updateFlowerImportLog = exports.createFlowerImportLog = exports.getFlowerImportLog = exports.getFlowerImportLogs = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const FlowerImportLog_1 = require("../models/FlowerImportLog");
// @desc    Get all flower import logs
// @route   GET /api/v1/flower-imports
// @access  Public
exports.getFlowerImportLogs = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { search, from, to, page, size } = req.query;
    // Build query
    const query = {};
    // Date range filter
    if (from || to) {
        query.date = {};
        if (from)
            query.date.$gte = from;
        if (to)
            query.date.$lte = to;
    }
    // Search filter (search in importer name or item types)
    if (search) {
        query.$or = [
            { importer: { $regex: search, $options: 'i' } },
            { 'items.type': { $regex: search, $options: 'i' } }
        ];
    }
    // Pagination
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = size ? parseInt(size) : 10;
    const skip = (pageNum - 1) * limitNum;
    // Execute query
    const [logs, total] = await Promise.all([
        FlowerImportLog_1.FlowerImportLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean()
            .exec(),
        FlowerImportLog_1.FlowerImportLog.countDocuments(query)
    ]);
    // Transform _id to id for frontend compatibility
    const transformedLogs = logs.map((log) => ({
        id: log._id.toString(),
        importer: log.importer,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    }));
    response_1.ResponseHandler.paginated(res, transformedLogs, pageNum, limitNum, total, "Flower import logs retrieved successfully");
});
// @desc    Get single flower import log
// @route   GET /api/v1/flower-imports/:id
// @access  Public
exports.getFlowerImportLog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const log = await FlowerImportLog_1.FlowerImportLog.findById(id).lean().exec();
    if (!log) {
        return response_1.ResponseHandler.notFound(res, "Flower import log not found");
    }
    // Transform _id to id
    const transformedLog = {
        id: log._id.toString(),
        importer: log.importer,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    };
    response_1.ResponseHandler.success(res, transformedLog, "Flower import log retrieved successfully");
});
// @desc    Create flower import log
// @route   POST /api/v1/flower-imports
// @access  Public
exports.createFlowerImportLog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { importer, date, items, history } = req.body;
    // Validate required fields
    if (!importer || !date || !items || !Array.isArray(items) || items.length === 0) {
        return response_1.ResponseHandler.badRequest(res, "Importer, date, and at least one item are required");
    }
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return response_1.ResponseHandler.badRequest(res, "Date must be in YYYY-MM-DD format");
    }
    // Create flower import log
    const flowerLog = await FlowerImportLog_1.FlowerImportLog.create({
        importer,
        date,
        items,
        history: history || [`Tạo phiếu ${date}`]
    });
    // Transform _id to id
    const transformedLog = {
        id: flowerLog._id.toString(),
        importer: flowerLog.importer,
        date: flowerLog.date,
        items: flowerLog.items,
        history: flowerLog.history,
        createdAt: flowerLog.createdAt,
        updatedAt: flowerLog.updatedAt
    };
    response_1.ResponseHandler.created(res, transformedLog, "Flower import log created successfully");
});
// @desc    Update flower import log
// @route   PUT /api/v1/flower-imports/:id
// @access  Public
exports.updateFlowerImportLog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { importer, date, items, history } = req.body;
    const log = await FlowerImportLog_1.FlowerImportLog.findById(id);
    if (!log) {
        return response_1.ResponseHandler.notFound(res, "Flower import log not found");
    }
    // Update fields
    if (importer !== undefined)
        log.importer = importer;
    if (date !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return response_1.ResponseHandler.badRequest(res, "Date must be in YYYY-MM-DD format");
        }
        log.date = date;
    }
    if (items !== undefined) {
        if (!Array.isArray(items) || items.length === 0) {
            return response_1.ResponseHandler.badRequest(res, "At least one item is required");
        }
        log.items = items;
    }
    if (history !== undefined) {
        log.history = Array.isArray(history) ? history : [...log.history, history];
    }
    else {
        // Auto-add history entry if not provided
        const today = new Date().toISOString().slice(0, 10);
        log.history.push(`Cập nhật ${today}`);
    }
    await log.save();
    // Transform _id to id
    const transformedLog = {
        id: log._id.toString(),
        importer: log.importer,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    };
    response_1.ResponseHandler.success(res, transformedLog, "Flower import log updated successfully");
});
// @desc    Delete flower import log
// @route   DELETE /api/v1/flower-imports/:id
// @access  Public
exports.deleteFlowerImportLog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const log = await FlowerImportLog_1.FlowerImportLog.findByIdAndDelete(id);
    if (!log) {
        return response_1.ResponseHandler.notFound(res, "Flower import log not found");
    }
    response_1.ResponseHandler.deleted(res, "Flower import log deleted successfully");
});
