import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { DeliveryOrder } from "../models/DeliveryOrder";
import path from "path";
import { logger } from "~/utils/logger";

// Generate order code
const generateOrderCode = (): string => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
    return `LALC${month}${year}-${randomStr}`;
};

// @desc    Create new draft delivery order
// @route   GET /api/v1/delivery/new
// @access  Private (Employee/Admin)
export const createDraftOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    // Generate unique order code
    let orderCode = generateOrderCode();
    let exists = await DeliveryOrder.findOne({ orderCode });
    while (exists) {
        orderCode = generateOrderCode();
        exists = await DeliveryOrder.findOne({ orderCode });
    }

    // Create draft order
    const deliveryOrder = await DeliveryOrder.create({
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

    ResponseHandler.success(res, deliveryOrder, "Draft order created successfully");
});

// @desc    Create delivery order
// @route   POST /api/v1/delivery
// @access  Private (Employee/Admin)
export const createDeliveryOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
        orderCode,
        buyerId,
        buyerName,
        deliveryDate,
        items,
        amount,
        isInvoice,
        isDebt,
        isShipped,
        proofImage,
        note,
    } = req.body;


    const userId = (req as any).user?.id;

    // Normalize to avoid accidental stripping from sanitation middleware
    const normalizedProofImage =
        typeof proofImage === "string" ? proofImage.trim() : proofImage;

    if (!orderCode || !buyerName || !deliveryDate || !items || !Array.isArray(items) || items.length === 0) {
        return next(new AppError("Missing required fields: orderCode, buyerName, deliveryDate, items", 400));
    }

    // Require proof image to avoid silent missing data
    if (!normalizedProofImage) {
        return next(new AppError("Proof image is required", 400));
    }

    // Check if orderCode already exists
    const existingOrder = await DeliveryOrder.findOne({ orderCode: orderCode.toUpperCase() });
    if (existingOrder) {
        return next(new AppError("Order code already exists", 400));
    }

 
    // Calculate total from items
    const calculatedAmount = items.reduce((total: number, item: any) => {
        const itemTotal = item.quantity * item.price;
        return total + itemTotal;
    }, 0);

    // Create delivery order
    const deliveryOrder = await DeliveryOrder.create({
        orderCode: orderCode.toUpperCase(),
        buyerId: buyerId || undefined,
        buyerName: buyerName.trim(),
        deliveryDate: new Date(deliveryDate),
        items: items.map((item: any) => ({
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

    ResponseHandler.created(res, deliveryOrderObj, "Delivery order created successfully");
});

// @desc    Get all delivery orders
// @route   GET /api/v1/delivery
// @access  Private (Employee/Admin)
export const getAllDeliveryOrders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const buyerName = req.query.buyerName as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const isShipped = req.query.isShipped as string;

    const query: any = {};

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

    if (isShipped !== undefined) {
        query.isShipped = isShipped === "true";
    }

    const skip = (page - 1) * limit;

    const deliveryOrders = await DeliveryOrder.find(query)
        .populate("createdBy", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await DeliveryOrder.countDocuments(query);

    ResponseHandler.paginated(res, deliveryOrders, page, limit, total, "Delivery orders retrieved successfully");
});

// @desc    Get delivery order by ID
// @route   GET /api/v1/delivery/:id
// @access  Private (Employee/Admin)
export const getDeliveryOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const deliveryOrder = await DeliveryOrder.findById(id)
        .populate("createdBy", "firstName lastName email")
        .lean();

    if (!deliveryOrder) {
        return next(new AppError("Delivery order not found", 404));
    }

    ResponseHandler.success(res, deliveryOrder, "Delivery order retrieved successfully");
});

// @desc    Get delivery order by orderCode
// @route   GET /api/v1/delivery/code/:orderCode
// @access  Private (Employee/Admin)
export const getDeliveryOrderByCode = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { orderCode } = req.params;

    const deliveryOrder = await DeliveryOrder.findOne({ orderCode: orderCode.toUpperCase() })
        .populate("createdBy", "firstName lastName email")
        .lean();

    if (!deliveryOrder) {
        return next(new AppError("Delivery order not found", 404));
    }

    ResponseHandler.success(res, deliveryOrder, "Delivery order retrieved successfully");
});

// @desc    Update delivery order
// @route   PUT /api/v1/delivery/:id
// @access  Private (Employee/Admin)
export const updateDeliveryOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const {
        buyerId,
        buyerName,
        deliveryDate,
        items,
        isInvoice,
        isDebt,
        isShipped,
        proofImage,
        note,
        status,
    } = req.body;

    const deliveryOrder = await DeliveryOrder.findById(id);

    if (!deliveryOrder) {
        return next(new AppError("Delivery order not found", 404));
    }

    // Update fields
    if (buyerId !== undefined) deliveryOrder.buyerId = buyerId || undefined;
    if (buyerName) deliveryOrder.buyerName = buyerName.trim();
    if (deliveryDate) deliveryOrder.deliveryDate = new Date(deliveryDate);
    if (items && Array.isArray(items)) {
        // Process items: keep existing ones with IDs, add new ones without IDs
        const existingItemIds = new Set(
            items
                .filter((item: any) => item.id)
                .map((item: any) => item.id.toString())
        );
        
        // Remove items that are not in the new list
        deliveryOrder.items = deliveryOrder.items.filter((item: any) =>
            existingItemIds.has(item._id.toString())
        );
        
        // Update or add items
        items.forEach((item: any) => {
            if (item.id) {
                // Update existing item
                const existingItem = (deliveryOrder.items as any).id(item.id);
                if (existingItem) {
                    existingItem.name = item.name;
                    existingItem.quantity = item.quantity;
                    existingItem.price = item.price;
                    existingItem.total = item.quantity * item.price;
                    if (item.productId) existingItem.productId = item.productId;
                }
            } else {
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
    if (isInvoice !== undefined) deliveryOrder.isInvoice = isInvoice;
    if (isDebt !== undefined) deliveryOrder.isDebt = isDebt;
    if (isShipped !== undefined) deliveryOrder.isShipped = isShipped;
    const normalizedProofImage =
        typeof proofImage === "string" ? proofImage.trim() : proofImage;
    if (normalizedProofImage) deliveryOrder.proofImage = normalizedProofImage;
    if (note !== undefined) deliveryOrder.note = note;
    if (status) deliveryOrder.status = status;

    // Validate buyerName is required when status is completed
    if (deliveryOrder.status === "completed" && !deliveryOrder.buyerName?.trim()) {
        return next(new AppError("buyerName is required when status is completed", 400));
    }

    await deliveryOrder.save();

    ResponseHandler.success(res, deliveryOrder, "Delivery order updated successfully");
});

// @desc    Upload proof image
// @route   POST /api/v1/delivery/:id/upload-proof
// @access  Private (Employee/Admin)
export const uploadProofImage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const file = req.file as Express.Multer.File;

    const deliveryOrder = await DeliveryOrder.findById(id);

    if (!deliveryOrder) {
        return next(new AppError("Delivery order not found", 404));
    }

    if (!file) {
        return next(new AppError("No file uploaded", 400));
    }

    const filename = file.filename || path.basename(file.path);
    const proofUrl = `${req.protocol}://${req.get("host")}/uploads/proofs/${filename}`;

    deliveryOrder.proofImage = proofUrl;
    await deliveryOrder.save();

    ResponseHandler.success(res, {
        proofUrl,
        deliveryOrder
    }, "Proof image uploaded successfully");
});

// @desc    Get proof image
// @route   GET /api/v1/delivery/:id/upload-proof
// @access  Private (Employee/Admin)
export const getDeliveryProofImage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const deliveryOrder = await DeliveryOrder.findById(id).lean();

    if (!deliveryOrder) {
        return next(new AppError("Delivery order not found", 404));
    }

    ResponseHandler.success(res, {
        proofImage: deliveryOrder.proofImage || null,
        orderId: id,
    }, "Proof image retrieved successfully");
});

// @desc    Delete delivery order
// @route   DELETE /api/v1/delivery/:id
// @access  Private (Admin only)
export const deleteDeliveryOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const deliveryOrder = await DeliveryOrder.findByIdAndDelete(id);

    if (!deliveryOrder) {
        return next(new AppError("Delivery order not found", 404));
    }

    ResponseHandler.success(res, null, "Delivery order deleted successfully");
});

