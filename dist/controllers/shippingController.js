"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShippingProofs = exports.uploadShippingProof = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const Order_1 = require("../models/Order");
const cloudinary_1 = require("../utils/cloudinary");
const mongoose_1 = __importDefault(require("mongoose"));
// Simple in-memory storage for shipping proofs (can be moved to DB later)
// In production, you might want to create a ShippingProof model
const shippingProofsMap = new Map();
// @desc    Upload shipping proof
// @route   POST /api/v1/upload-proof
// @access  Private (Employee/Admin)
exports.uploadShippingProof = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { orderId, orderNumber, notes } = req.body;
    const file = req.file;
    const userId = req.user?.id;
    if (!orderId && !orderNumber) {
        return next(new AppError_1.AppError("Order ID or Order Number is required", 400));
    }
    if (!file) {
        return next(new AppError_1.AppError("No file uploaded", 400));
    }
    // Find order
    let order;
    if (orderId) {
        order = await Order_1.Order.findById(orderId);
    }
    else {
        order = await Order_1.Order.findOne({ orderNumber: orderNumber.toUpperCase() });
    }
    if (!order) {
        return next(new AppError_1.AppError("Order not found", 404));
    }
    // Upload to Cloudinary
    const timestamp = Date.now();
    const publicId = `shipping-proofs/${order._id}-${timestamp}`;
    const cloudinaryResult = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, {
        folder: "shipping-proofs",
        public_id: publicId,
        resource_type: "image"
    });
    // Store proof (in production, save to database)
    const proof = {
        order: order._id,
        orderNumber: order.orderNumber,
        proofImage: cloudinaryResult.secure_url,
        shippedAt: new Date(),
        shippedBy: new mongoose_1.default.Types.ObjectId(userId),
        notes: notes || "",
        createdAt: new Date(),
        updatedAt: new Date()
    };
    // Get existing proofs for this order
    const orderIdStr = order._id.toString();
    const existingProofs = shippingProofsMap.get(orderIdStr) || [];
    existingProofs.push(proof);
    shippingProofsMap.set(orderIdStr, existingProofs);
    // Update order status if needed
    if (order.status === "processing" || order.status === "confirmed") {
        await Order_1.Order.findByIdAndUpdate(order._id, {
            status: "shipped",
            $push: {
                statusHistory: {
                    status: "shipped",
                    updatedAt: new Date(),
                    note: `Shipping proof uploaded by employee`,
                    updatedBy: new mongoose_1.default.Types.ObjectId(userId)
                }
            }
        });
    }
    response_1.ResponseHandler.created(res, {
        proofId: timestamp.toString(),
        proofUrl: cloudinaryResult.secure_url,
        orderId: order._id,
        orderNumber: order.orderNumber,
        shippedAt: proof.shippedAt
    }, "Shipping proof uploaded successfully");
});
// @desc    Get shipping proofs for an order
// @route   GET /api/v1/upload-proof/:orderId
// @access  Private (Employee/Admin)
exports.getShippingProofs = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { orderId } = req.params;
    const order = await Order_1.Order.findById(orderId);
    if (!order) {
        return next(new AppError_1.AppError("Order not found", 404));
    }
    // Get proofs from memory (in production, query from database)
    const proofs = shippingProofsMap.get(orderId) || [];
    response_1.ResponseHandler.success(res, proofs, "Shipping proofs retrieved successfully");
});
