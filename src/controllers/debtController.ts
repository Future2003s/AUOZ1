import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { Debt } from "../models/Debt";
import { Order } from "../models/Order";
import { uploadToCloudinary } from "../utils/cloudinary";

// @desc    Get all debts with filters
// @route   GET /api/v1/debt
// @access  Private (Employee/Admin)
export const getAllDebts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const customerId = req.query.customerId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const query: any = {};
    
    if (status) {
        query.status = status;
    }
    
    if (customerId) {
        query.customer = customerId;
    }
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            query.createdAt.$lte = new Date(endDate);
        }
    }
    
    const skip = (page - 1) * limit;
    
    const debts = await Debt.find(query)
        .populate("customer", "firstName lastName email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    
    const total = await Debt.countDocuments(query);
    
    ResponseHandler.paginated(res, debts, page, limit, total, "Debts retrieved successfully");
});

// @desc    Get debt by ID
// @route   GET /api/v1/debt/:id
// @access  Private (Employee/Admin)
export const getDebt = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    const debt = await Debt.findById(id)
        .populate("customer", "firstName lastName email phone")
        .populate("items.order", "orderNumber status total")
        .populate("history.updatedBy", "firstName lastName email")
        .lean();
    
    if (!debt) {
        return next(new AppError("Debt not found", 404));
    }
    
    ResponseHandler.success(res, debt, "Debt retrieved successfully");
});

// @desc    Create new debt
// @route   POST /api/v1/debt
// @access  Private (Employee/Admin)
export const createDebt = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { customerId, customerName, customerPhone, customerEmail, orderId, orderNumber, amount, description, dueDate, notes } = req.body;
    const userId = (req as any).user?.id;
    
    if (!customerId || !orderId || !amount || !dueDate) {
        return next(new AppError("Customer ID, Order ID, amount, and due date are required", 400));
    }
    
    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
        return next(new AppError("Order not found", 404));
    }
    
    // Check if debt already exists for this customer and order
    let debt = await Debt.findOne({
        customer: customerId,
        "items.order": orderId
    });
    
    if (debt) {
        // Check if item already exists
        const existingItem = debt.items.find((item: any) => 
            item.order.toString() === orderId
        );
        
        if (!existingItem) {
            // Add new item to existing debt
            debt.items.push({
                order: orderId,
                orderNumber: orderNumber || order.orderNumber,
                amount,
                description,
                dueDate: new Date(dueDate),
                status: "pending"
            });
        } else {
            return next(new AppError("Debt item already exists for this order", 400));
        }
    } else {
        // Create new debt
        debt = new Debt({
            customer: customerId,
            customerName: customerName || `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
            customerPhone: customerPhone || order.shippingAddress?.phone,
            customerEmail: customerEmail,
            items: [{
                order: orderId,
                orderNumber: orderNumber || order.orderNumber,
                amount,
                description,
                dueDate: new Date(dueDate),
                status: "pending"
            }],
            dueDate: new Date(dueDate),
            notes,
            status: "pending"
        });
    }
    
    debt.calculateTotals();
    debt.updateStatus();
    debt.addHistory("created", userId, "Debt created", amount);
    
    await debt.save();
    
    const populatedDebt = await Debt.findById(debt._id)
        .populate("customer", "firstName lastName email phone")
        .populate("items.order", "orderNumber status total");
    
    ResponseHandler.created(res, populatedDebt, "Debt created successfully");
});

// @desc    Update debt
// @route   PUT /api/v1/debt/:id
// @access  Private (Employee/Admin)
export const updateDebt = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { amount, dueDate, description, notes } = req.body;
    const userId = (req as any).user?.id;
    
    const debt = await Debt.findById(id);
    if (!debt) {
        return next(new AppError("Debt not found", 404));
    }
    
    if (amount !== undefined) {
        // Update first pending item
        const pendingItem = debt.items.find((item: any) => item.status === "pending");
        if (pendingItem) {
            const oldAmount = pendingItem.amount;
            pendingItem.amount = amount;
            if (dueDate) {
                pendingItem.dueDate = new Date(dueDate);
            }
            if (description !== undefined) {
                pendingItem.description = description;
            }
            debt.addHistory("updated", userId, `Amount updated from ${oldAmount} to ${amount}`, amount);
        }
    }
    
    if (dueDate && !amount) {
        debt.dueDate = new Date(dueDate);
        debt.items.forEach((item: any) => {
            if (item.status === "pending") {
                item.dueDate = new Date(dueDate);
            }
        });
    }
    
    if (notes !== undefined) {
        debt.notes = notes;
        debt.addHistory("note_added", userId, notes);
    }
    
    debt.calculateTotals();
    debt.updateStatus();
    
    await debt.save();
    
    const populatedDebt = await Debt.findById(debt._id)
        .populate("customer", "firstName lastName email phone")
        .populate("items.order", "orderNumber status total");
    
    ResponseHandler.success(res, populatedDebt, "Debt updated successfully");
});

// @desc    Mark debt as paid
// @route   PUT /api/v1/debt/:id/paid
// @access  Private (Employee/Admin)
export const markDebtPaid = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { itemId, paymentProof } = req.body;
    const userId = (req as any).user?.id;
    
    const debt = await Debt.findById(id);
    if (!debt) {
        return next(new AppError("Debt not found", 404));
    }
    
    if (itemId) {
        // Mark specific item as paid
        const item = (debt.items as any).id(itemId);
        if (!item) {
            return next(new AppError("Debt item not found", 404));
        }
        
        if (item.status === "paid") {
            return next(new AppError("Item is already paid", 400));
        }
        
        item.status = "paid";
        item.paidAt = new Date();
        if (paymentProof) {
            item.paymentProof = paymentProof;
        }
        
        debt.addHistory("paid", userId, `Item ${item.orderNumber} marked as paid`, item.amount);
    } else {
        // Mark all items as paid
        debt.items.forEach((item: any) => {
            if (item.status !== "paid") {
                item.status = "paid";
                item.paidAt = new Date();
                if (paymentProof) {
                    item.paymentProof = paymentProof;
                }
            }
        });
        
        debt.addHistory("paid", userId, "All items marked as paid", debt.remainingAmount);
    }
    
    debt.calculateTotals();
    debt.updateStatus();
    
    await debt.save();
    
    const populatedDebt = await Debt.findById(debt._id)
        .populate("customer", "firstName lastName email phone")
        .populate("items.order", "orderNumber status total");
    
    ResponseHandler.success(res, populatedDebt, "Debt marked as paid successfully");
});

// @desc    Upload payment proof
// @route   POST /api/v1/debt/:id/proof
// @access  Private (Employee/Admin)
export const uploadPaymentProof = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { itemId } = req.body;
    const file = req.file as Express.Multer.File;
    
    if (!file) {
        return next(new AppError("No file uploaded", 400));
    }
    
    const debt = await Debt.findById(id);
    if (!debt) {
        return next(new AppError("Debt not found", 404));
    }
    
    // Upload to Cloudinary
    const timestamp = Date.now();
    const publicId = `debt-proofs/${id}-${timestamp}`;
    
    const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: "debt-proofs",
        public_id: publicId,
        resource_type: "image"
    });
    
    if (itemId) {
        // Update specific item
        const item = (debt.items as any).id(itemId);
        if (item) {
            item.paymentProof = cloudinaryResult.secure_url;
        }
    } else {
        // Update all unpaid items
        debt.items.forEach((item: any) => {
            if (item.status !== "paid") {
                item.paymentProof = cloudinaryResult.secure_url;
            }
        });
    }
    
    await debt.save();
    
    ResponseHandler.success(res, { proofUrl: cloudinaryResult.secure_url }, "Payment proof uploaded successfully");
});

