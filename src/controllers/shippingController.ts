import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { Order } from "../models/Order";
import { uploadToCloudinary } from "../utils/cloudinary";
import mongoose, { Document } from "mongoose";

interface IShippingProof extends Document {
    order: mongoose.Types.ObjectId;
    orderNumber: string;
    proofImage: string;
    shippedAt: Date;
    shippedBy: mongoose.Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Simple in-memory storage for shipping proofs (can be moved to DB later)
// In production, you might want to create a ShippingProof model
const shippingProofsMap = new Map<string, IShippingProof[]>();

// @desc    Upload shipping proof
// @route   POST /api/v1/upload-proof
// @access  Private (Employee/Admin)
export const uploadShippingProof = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { orderId, orderNumber, notes } = req.body;
    const file = req.file as Express.Multer.File;
    const userId = (req as any).user?.id;
    
    if (!orderId && !orderNumber) {
        return next(new AppError("Order ID or Order Number is required", 400));
    }
    
    if (!file) {
        return next(new AppError("No file uploaded", 400));
    }
    
    // Find order
    let order: any;
    if (orderId) {
        order = await Order.findById(orderId);
    } else {
        order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
    }
    
    if (!order) {
        return next(new AppError("Order not found", 404));
    }
    
    // Upload to Cloudinary
    const timestamp = Date.now();
    const publicId = `shipping-proofs/${order._id}-${timestamp}`;
    
    const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: "shipping-proofs",
        public_id: publicId,
        resource_type: "image"
    });
    
    // Store proof (in production, save to database)
    const proof: IShippingProof = {
        order: order._id,
        orderNumber: order.orderNumber,
        proofImage: cloudinaryResult.secure_url,
        shippedAt: new Date(),
        shippedBy: new mongoose.Types.ObjectId(userId),
        notes: notes || "",
        createdAt: new Date(),
        updatedAt: new Date()
    } as any;
    
    // Get existing proofs for this order
    const orderIdStr = order._id.toString();
    const existingProofs = shippingProofsMap.get(orderIdStr) || [];
    existingProofs.push(proof);
    shippingProofsMap.set(orderIdStr, existingProofs);
    
    // Update order status if needed
    if (order.status === "processing" || order.status === "confirmed") {
        await Order.findByIdAndUpdate(order._id, {
            status: "shipped",
            $push: {
                statusHistory: {
                    status: "shipped",
                    updatedAt: new Date(),
                    note: `Shipping proof uploaded by employee`,
                    updatedBy: new mongoose.Types.ObjectId(userId)
                }
            }
        });
    }
    
    ResponseHandler.created(res, {
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
export const getShippingProofs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    if (!order) {
        return next(new AppError("Order not found", 404));
    }
    
    // Get proofs from memory (in production, query from database)
    const proofs = shippingProofsMap.get(orderId) || [];
    
    ResponseHandler.success(res, proofs, "Shipping proofs retrieved successfully");
});

