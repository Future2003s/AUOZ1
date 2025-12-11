"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBuyer = exports.updateBuyer = exports.createBuyer = exports.getBuyer = exports.getAllBuyers = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const Buyer_1 = require("../models/Buyer");
// @desc    Get all buyers
// @route   GET /api/v1/buyers
// @access  Private (Employee/Admin)
exports.getAllBuyers = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search;
    const query = {};
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }
    const skip = (page - 1) * limit;
    const buyers = await Buyer_1.Buyer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await Buyer_1.Buyer.countDocuments(query);
    response_1.ResponseHandler.paginated(res, buyers, page, limit, total, "Buyers retrieved successfully");
});
// @desc    Get buyer by ID
// @route   GET /api/v1/buyers/:id
// @access  Private (Employee/Admin)
exports.getBuyer = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const buyer = await Buyer_1.Buyer.findById(id).lean();
    if (!buyer) {
        return next(new AppError_1.AppError("Buyer not found", 404));
    }
    response_1.ResponseHandler.success(res, buyer, "Buyer retrieved successfully");
});
// @desc    Create buyer
// @route   POST /api/v1/buyers
// @access  Private (Employee/Admin)
exports.createBuyer = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { name, phone, email, address, notes } = req.body;
    if (!name || !name.trim()) {
        return next(new AppError_1.AppError("Buyer name is required", 400));
    }
    const buyer = await Buyer_1.Buyer.create({
        name: name.trim(),
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
        address: address?.trim() || undefined,
        notes: notes?.trim() || undefined,
    });
    response_1.ResponseHandler.created(res, buyer, "Buyer created successfully");
});
// @desc    Update buyer
// @route   PUT /api/v1/buyers/:id
// @access  Private (Employee/Admin)
exports.updateBuyer = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { name, phone, email, address, notes } = req.body;
    const buyer = await Buyer_1.Buyer.findById(id);
    if (!buyer) {
        return next(new AppError_1.AppError("Buyer not found", 404));
    }
    if (name)
        buyer.name = name.trim();
    if (phone !== undefined)
        buyer.phone = phone?.trim() || undefined;
    if (email !== undefined)
        buyer.email = email?.trim() || undefined;
    if (address !== undefined)
        buyer.address = address?.trim() || undefined;
    if (notes !== undefined)
        buyer.notes = notes?.trim() || undefined;
    await buyer.save();
    response_1.ResponseHandler.success(res, buyer, "Buyer updated successfully");
});
// @desc    Delete buyer
// @route   DELETE /api/v1/buyers/:id
// @access  Private (Admin only)
exports.deleteBuyer = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const buyer = await Buyer_1.Buyer.findByIdAndDelete(id);
    if (!buyer) {
        return next(new AppError_1.AppError("Buyer not found", 404));
    }
    response_1.ResponseHandler.success(res, null, "Buyer deleted successfully");
});
