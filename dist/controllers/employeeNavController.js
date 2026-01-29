"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordEmployeeNavUsage = exports.getEmployeeNavUsage = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const EmployeeNavUsage_1 = require("../models/EmployeeNavUsage");
const AppError_1 = require("../utils/AppError");
// @desc    Get employee nav usage for current user
// @route   GET /api/v1/employee/nav-usage
// @access  Private (ADMIN, EMPLOYEE) - guarded by employee router
exports.getEmployeeNavUsage = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    if (!req.user || !req.user.id) {
        return next(new AppError_1.AppError("User not found in request", 401));
    }
    const userId = new mongoose_1.default.Types.ObjectId(req.user.id);
    const entries = await EmployeeNavUsage_1.EmployeeNavUsage.find({ userId })
        .sort({ count: -1, lastUsed: -1 })
        .lean()
        .exec();
    const data = entries.map((entry) => ({
        itemId: entry.itemId,
        count: entry.count,
        lastUsed: entry.lastUsed
    }));
    response_1.ResponseHandler.success(res, data, "Employee navigation usage retrieved successfully");
});
// @desc    Record nav usage for current user
// @route   POST /api/v1/employee/nav-usage
// @access  Private (ADMIN, EMPLOYEE) - guarded by employee router
exports.recordEmployeeNavUsage = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    if (!req.user || !req.user.id) {
        return next(new AppError_1.AppError("User not found in request", 401));
    }
    const { itemId } = req.body;
    if (!itemId || typeof itemId !== "string") {
        return response_1.ResponseHandler.badRequest(res, "itemId is required");
    }
    const userId = new mongoose_1.default.Types.ObjectId(req.user.id);
    const entry = await EmployeeNavUsage_1.EmployeeNavUsage.findOneAndUpdate({ userId, itemId }, {
        $inc: { count: 1 },
        $set: { lastUsed: new Date() }
    }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
    }).lean();
    const data = {
        itemId: entry.itemId,
        count: entry.count,
        lastUsed: entry.lastUsed
    };
    response_1.ResponseHandler.success(res, data, "Employee navigation usage recorded successfully");
});
