"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDeliveryOrder = exports.getDeliveryProofImage = exports.uploadProofImage = exports.updateDeliveryOrder = exports.getDeliveryOrderByCode = exports.getDeliveryOrder = exports.getAllDeliveryOrders = exports.createDeliveryOrder = exports.createDraftOrder = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const DeliveryOrder_1 = require("../models/DeliveryOrder");
const path_1 = __importDefault(require("path"));
// Generate order code
const generateOrderCode = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
    return `LALC${month}${year}-${randomStr}`;
};
// @desc    Create new draft delivery order
// @route   GET /api/v1/delivery/new
// @access  Private (Employee/Admin)
exports.createDraftOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.id;
    // Generate unique order code
    let orderCode = generateOrderCode();
    let exists = await DeliveryOrder_1.DeliveryOrder.findOne({ orderCode });
    while (exists) {
        orderCode = generateOrderCode();
        exists = await DeliveryOrder_1.DeliveryOrder.findOne({ orderCode });
    }
    // Create draft order
    const deliveryOrder = await DeliveryOrder_1.DeliveryOrder.create({
        orderCode,
        buyerName: "",
        deliveryDate: new Date(),
        items: [],
        amount: 0,
        isInvoice: false,
        isDebt: false,
        isShipped: false,
        status: "draft",
        createdBy: userId,
    });
    response_1.ResponseHandler.success(res, deliveryOrder, "Draft order created successfully");
});
// @desc    Create delivery order
// @route   POST /api/v1/delivery
// @access  Private (Employee/Admin)
exports.createDeliveryOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { orderCode, buyerId, buyerName, deliveryDate, items, amount, isInvoice, isDebt, isShipped, proofImage, note, } = req.body;
    const userId = req.user?.id;
    // Normalize to avoid accidental stripping from sanitation middleware
    const normalizedProofImage = typeof proofImage === "string" ? proofImage.trim() : proofImage;
    if (!orderCode || !buyerName || !deliveryDate || !items || !Array.isArray(items) || items.length === 0) {
        return next(new AppError_1.AppError("Missing required fields: orderCode, buyerName, deliveryDate, items", 400));
    }
    // Require proof image to avoid silent missing data
    if (!normalizedProofImage) {
        return next(new AppError_1.AppError("Proof image is required", 400));
    }
    // Check if orderCode already exists
    const existingOrder = await DeliveryOrder_1.DeliveryOrder.findOne({ orderCode: orderCode.toUpperCase() });
    if (existingOrder) {
        return next(new AppError_1.AppError("Order code already exists", 400));
    }
    // Calculate total from items
    const calculatedAmount = items.reduce((total, item) => {
        const itemTotal = item.quantity * item.price;
        return total + itemTotal;
    }, 0);
    // Create delivery order
    const deliveryOrder = await DeliveryOrder_1.DeliveryOrder.create({
        orderCode: orderCode.toUpperCase(),
        buyerId: buyerId || undefined,
        buyerName: buyerName.trim(),
        deliveryDate: new Date(deliveryDate),
        items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
            productId: item.productId || undefined,
        })),
        amount: calculatedAmount,
        isInvoice: isInvoice || false,
        isDebt: isDebt || false,
        isShipped: isShipped || false,
        proofImage: normalizedProofImage,
        note: note || "",
        status: "completed",
        createdBy: userId,
    });
    const deliveryOrderObj = {
        ...deliveryOrder.toObject(),
        proofImage: normalizedProofImage, // guarantee the field is present in the payload
    };
    // res.status(200).json({
    //     id: deliveryOrderObj._id,
    //     orderCode: deliveryOrderObj.orderCode,
    //     buyerName: deliveryOrderObj.buyerName,
    //     amount: deliveryOrderObj.amount,
    //     itemsCount: deliveryOrderObj.items.length,
    //     proofImage: deliveryOrderObj.proofImage,
    // });
    response_1.ResponseHandler.created(res, deliveryOrderObj, "Delivery order created successfully");
});
// @desc    Get all delivery orders
// @route   GET /api/v1/delivery
// @access  Private (Employee/Admin)
exports.getAllDeliveryOrders = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const buyerName = req.query.buyerName;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const isShipped = req.query.isShipped;
    const query = {};
    if (search) {
        query.$or = [
            { orderCode: { $regex: search, $options: "i" } },
            { buyerName: { $regex: search, $options: "i" } },
        ];
    }
    if (buyerName) {
        query.buyerName = { $regex: buyerName, $options: "i" };
    }
    if (startDate || endDate) {
        query.deliveryDate = {};
        if (startDate) {
            query.deliveryDate.$gte = new Date(startDate);
        }
        if (endDate) {
            query.deliveryDate.$lte = new Date(endDate);
        }
    }
    if (isShipped !== undefined && isShipped !== null && isShipped !== "") {
        query.isShipped = isShipped === "true";
    }
    const skip = (page - 1) * limit;
    // Log for debugging
    console.log("[Delivery Controller] Query params:", {
        page,
        limit,
        search,
        buyerName,
        startDate,
        endDate,
        isShipped,
        query,
    });
    // Check total count before filtering
    const totalBeforeFilter = await DeliveryOrder_1.DeliveryOrder.countDocuments({});
    console.log("[Delivery Controller] Total delivery orders in DB:", totalBeforeFilter);
    const deliveryOrders = await DeliveryOrder_1.DeliveryOrder.find(query)
        .populate("createdBy", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await DeliveryOrder_1.DeliveryOrder.countDocuments(query);
    console.log("[Delivery Controller] Found delivery orders:", deliveryOrders.length, "Total matching query:", total);
    response_1.ResponseHandler.paginated(res, deliveryOrders, page, limit, total, "Delivery orders retrieved successfully");
});
// @desc    Get delivery order by ID
// @route   GET /api/v1/delivery/:id
// @access  Private (Employee/Admin)
exports.getDeliveryOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const deliveryOrder = await DeliveryOrder_1.DeliveryOrder.findById(id)
        .populate("createdBy", "firstName lastName email")
        .lean();
    if (!deliveryOrder) {
        return next(new AppError_1.AppError("Delivery order not found", 404));
    }
    response_1.ResponseHandler.success(res, deliveryOrder, "Delivery order retrieved successfully");
});
// @desc    Get delivery order by orderCode
// @route   GET /api/v1/delivery/code/:orderCode
// @access  Private (Employee/Admin)
exports.getDeliveryOrderByCode = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { orderCode } = req.params;
    const deliveryOrder = await DeliveryOrder_1.DeliveryOrder.findOne({ orderCode: orderCode.toUpperCase() })
        .populate("createdBy", "firstName lastName email")
        .lean();
    if (!deliveryOrder) {
        return next(new AppError_1.AppError("Delivery order not found", 404));
    }
    response_1.ResponseHandler.success(res, deliveryOrder, "Delivery order retrieved successfully");
});
// @desc    Update delivery order
// @route   PUT /api/v1/delivery/:id
// @access  Private (Employee/Admin)
exports.updateDeliveryOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { buyerId, buyerName, deliveryDate, items, isInvoice, isDebt, isShipped, proofImage, note, status, } = req.body;
    const deliveryOrder = await DeliveryOrder_1.DeliveryOrder.findById(id);
    if (!deliveryOrder) {
        return next(new AppError_1.AppError("Delivery order not found", 404));
    }
    // Update fields
    if (buyerId !== undefined)
        deliveryOrder.buyerId = buyerId || undefined;
    if (buyerName)
        deliveryOrder.buyerName = buyerName.trim();
    if (deliveryDate)
        deliveryOrder.deliveryDate = new Date(deliveryDate);
    if (items && Array.isArray(items)) {
        // Process items: keep existing ones with IDs, add new ones without IDs
        const existingItemIds = new Set(items
            .filter((item) => item.id)
            .map((item) => item.id.toString()));
        // Remove items that are not in the new list
        deliveryOrder.items = deliveryOrder.items.filter((item) => existingItemIds.has(item._id.toString()));
        // Update or add items
        items.forEach((item) => {
            if (item.id) {
                // Update existing item
                const existingItem = deliveryOrder.items.id(item.id);
                if (existingItem) {
                    existingItem.name = item.name;
                    existingItem.quantity = item.quantity;
                    existingItem.price = item.price;
                    existingItem.total = item.quantity * item.price;
                    if (item.productId)
                        existingItem.productId = item.productId;
                }
            }
            else {
                // Add new item
                deliveryOrder.items.push({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.quantity * item.price,
                    productId: item.productId || undefined,
                });
            }
        });
        // Amount will be recalculated in pre-save middleware
    }
    if (isInvoice !== undefined)
        deliveryOrder.isInvoice = isInvoice;
    if (isDebt !== undefined)
        deliveryOrder.isDebt = isDebt;
    if (isShipped !== undefined)
        deliveryOrder.isShipped = isShipped;
    const normalizedProofImage = typeof proofImage === "string" ? proofImage.trim() : proofImage;
    if (normalizedProofImage)
        deliveryOrder.proofImage = normalizedProofImage;
    if (note !== undefined)
        deliveryOrder.note = note;
    if (status)
        deliveryOrder.status = status;
    // Validate buyerName is required when status is completed
    if (deliveryOrder.status === "completed" && !deliveryOrder.buyerName?.trim()) {
        return next(new AppError_1.AppError("buyerName is required when status is completed", 400));
    }
    await deliveryOrder.save();
    response_1.ResponseHandler.success(res, deliveryOrder, "Delivery order updated successfully");
});
// @desc    Upload proof image
// @route   POST /api/v1/delivery/:id/upload-proof
// @access  Private (Employee/Admin)
exports.uploadProofImage = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const file = req.file;
    const deliveryOrder = await DeliveryOrder_1.DeliveryOrder.findById(id);
    if (!deliveryOrder) {
        return next(new AppError_1.AppError("Delivery order not found", 404));
    }
    if (!file) {
        return next(new AppError_1.AppError("No file uploaded", 400));
    }
    const filename = file.filename || path_1.default.basename(file.path);
    const proofUrl = `${req.protocol}://${req.get("host")}/uploads/proofs/${filename}`;
    deliveryOrder.proofImage = proofUrl;
    await deliveryOrder.save();
    response_1.ResponseHandler.success(res, {
        proofUrl,
        deliveryOrder
    }, "Proof image uploaded successfully");
});
// @desc    Get proof image
// @route   GET /api/v1/delivery/:id/upload-proof
// @access  Private (Employee/Admin)
exports.getDeliveryProofImage = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const deliveryOrder = await DeliveryOrder_1.DeliveryOrder.findById(id).lean();
    if (!deliveryOrder) {
        return next(new AppError_1.AppError("Delivery order not found", 404));
    }
    response_1.ResponseHandler.success(res, {
        proofImage: deliveryOrder.proofImage || null,
        orderId: id,
    }, "Proof image retrieved successfully");
});
// @desc    Delete delivery order
// @route   DELETE /api/v1/delivery/:id
// @access  Private (Admin only)
exports.deleteDeliveryOrder = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const deliveryOrder = await DeliveryOrder_1.DeliveryOrder.findByIdAndDelete(id);
    if (!deliveryOrder) {
        return next(new AppError_1.AppError("Delivery order not found", 404));
    }
    response_1.ResponseHandler.success(res, null, "Delivery order deleted successfully");
});
