"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFlowerLog = exports.updateFlowerLog = exports.createFlowerLog = exports.getFlowerLog = exports.getFlowerLogs = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const FlowerLog_1 = require("../models/FlowerLog");
// @desc    Get all flower logs
// @route   GET /api/v1/flower-logs
// @access  Public
exports.getFlowerLogs = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
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
    // Search filter (search in cutter name or item types)
    if (search) {
        query.$or = [
            { cutter: { $regex: search, $options: 'i' } },
            { 'items.type': { $regex: search, $options: 'i' } }
        ];
    }
    // Pagination
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = size ? parseInt(size) : 10;
    const skip = (pageNum - 1) * limitNum;
    // Execute query
    const [logs, total] = await Promise.all([
        FlowerLog_1.FlowerLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean()
            .exec(),
        FlowerLog_1.FlowerLog.countDocuments(query)
    ]);
    // Transform _id to id for frontend compatibility
    const transformedLogs = logs.map((log) => ({
        id: log._id.toString(),
        cutter: log.cutter,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    }));
    response_1.ResponseHandler.paginated(res, transformedLogs, pageNum, limitNum, total, "Flower logs retrieved successfully");
});
// @desc    Get single flower log
// @route   GET /api/v1/flower-logs/:id
// @access  Public
exports.getFlowerLog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const log = await FlowerLog_1.FlowerLog.findById(id).lean().exec();
    if (!log) {
        return response_1.ResponseHandler.notFound(res, "Flower log not found");
    }
    // Transform _id to id
    const transformedLog = {
        id: log._id.toString(),
        cutter: log.cutter,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    };
    response_1.ResponseHandler.success(res, transformedLog, "Flower log retrieved successfully");
});
// @desc    Create flower log
// @route   POST /api/v1/flower-logs
// @access  Public
exports.createFlowerLog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { cutter, date, items, history } = req.body;
    // Validate required fields
    if (!cutter || !date || !items || !Array.isArray(items) || items.length === 0) {
        return response_1.ResponseHandler.badRequest(res, "Cutter, date, and at least one item are required");
    }
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return response_1.ResponseHandler.badRequest(res, "Date must be in YYYY-MM-DD format");
    }
    // Create flower log
    const flowerLog = await FlowerLog_1.FlowerLog.create({
        cutter,
        date,
        items,
        history: history || [`Tạo phiếu ${date}`]
    });
    // Transform _id to id
    const transformedLog = {
        id: flowerLog._id.toString(),
        cutter: flowerLog.cutter,
        date: flowerLog.date,
        items: flowerLog.items,
        history: flowerLog.history,
        createdAt: flowerLog.createdAt,
        updatedAt: flowerLog.updatedAt
    };
    response_1.ResponseHandler.created(res, transformedLog, "Flower log created successfully");
});
// @desc    Update flower log
// @route   PUT /api/v1/flower-logs/:id
// @access  Public
exports.updateFlowerLog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { cutter, date, items, history } = req.body;
    const log = await FlowerLog_1.FlowerLog.findById(id);
    if (!log) {
        return response_1.ResponseHandler.notFound(res, "Flower log not found");
    }
    // Update fields
    if (cutter !== undefined)
        log.cutter = cutter;
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
        cutter: log.cutter,
        date: log.date,
        items: log.items,
        history: log.history,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
    };
    response_1.ResponseHandler.success(res, transformedLog, "Flower log updated successfully");
});
// @desc    Delete flower log
// @route   DELETE /api/v1/flower-logs/:id
// @access  Public
exports.deleteFlowerLog = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const log = await FlowerLog_1.FlowerLog.findByIdAndDelete(id);
    if (!log) {
        return response_1.ResponseHandler.notFound(res, "Flower log not found");
    }
    response_1.ResponseHandler.deleted(res, "Flower log deleted successfully");
});
