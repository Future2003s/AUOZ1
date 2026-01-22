import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { Invoice } from "../models/Invoice";
import { Order } from "../models/Order";
import { Debt } from "../models/Debt";
import mongoose from "mongoose";

// @desc    Get employee dashboard metrics
// @route   GET /api/v1/employee/metrics
// @access  Private (Employee/Admin)
export const getEmployeeMetrics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Hóa đơn chưa hoàn thành (invoice status != "issued")
    const incompleteInvoices = await Invoice.countDocuments({
        status: { $ne: "issued" }
    });

    // 2. Đơn chưa nhận được hàng (order status != "delivered")
    const undeliveredOrders = await Order.countDocuments({
        status: { $ne: "delivered" }
    });

    // 3. Đơn chưa thanh toán (order payment.status != "completed")
    const unpaidOrders = await Order.countDocuments({
        "payment.status": { $ne: "completed" }
    });

    // 4. Chưa vào công nợ (invoice/order chưa có debt record)
    // Lấy tất cả invoices chưa issued
    const invoicesWithoutDebt = await Invoice.find({
        status: { $ne: "issued" }
    }).select("_id orders");

    // Lấy tất cả order IDs từ invoices
    const orderIdsFromInvoices = invoicesWithoutDebt.flatMap(inv => 
        inv.orders.map((o: any) => o.order)
    );

    // Lấy tất cả orders chưa delivered
    const undeliveredOrdersList = await Order.find({
        status: { $ne: "delivered" }
    }).select("_id");

    const allOrderIds = [
        ...orderIdsFromInvoices,
        ...undeliveredOrdersList.map(o => o._id)
    ];

    // Lấy tất cả order IDs đã có trong debt
    const debts = await Debt.find({}).select("items.order");
    const orderIdsInDebt = debts.flatMap(debt => 
        debt.items.map((item: any) => item.order)
    );

    // Đếm orders chưa có trong debt
    const ordersNotInDebt = allOrderIds.filter(
        orderId => !orderIdsInDebt.some(
            debtOrderId => debtOrderId.toString() === orderId.toString()
        )
    );

    const notInDebtCount = new Set(ordersNotInDebt.map(id => id.toString())).size;

    const metrics = {
        incompleteInvoices,
        undeliveredOrders,
        unpaidOrders,
        notInDebt: notInDebtCount
    };

    ResponseHandler.success(res, metrics, "Metrics retrieved successfully");
});

// @desc    Get incomplete invoices details
// @route   GET /api/v1/employee/metrics/incomplete-invoices
// @access  Private (Employee/Admin)
export const getIncompleteInvoices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const invoices = await Invoice.find({
        status: { $ne: "issued" }
    })
        .populate("customer", "firstName lastName email phone")
        .populate("orders.order", "orderNumber status total createdAt")
        .sort({ deadline: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Invoice.countDocuments({
        status: { $ne: "issued" }
    });

    ResponseHandler.paginated(res, invoices, page, limit, total, "Incomplete invoices retrieved successfully");
});

// @desc    Get undelivered orders details
// @route   GET /api/v1/employee/metrics/undelivered-orders
// @access  Private (Employee/Admin)
export const getUndeliveredOrders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const orders = await Order.find({
        status: { $ne: "delivered" }
    })
        .populate("user", "firstName lastName email phone")
        .populate("items.product", "name slug sku images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Order.countDocuments({
        status: { $ne: "delivered" }
    });

    ResponseHandler.paginated(res, orders, page, limit, total, "Undelivered orders retrieved successfully");
});

// @desc    Get unpaid orders details
// @route   GET /api/v1/employee/metrics/unpaid-orders
// @access  Private (Employee/Admin)
export const getUnpaidOrders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const orders = await Order.find({
        "payment.status": { $ne: "completed" }
    })
        .populate("user", "firstName lastName email phone")
        .populate("items.product", "name slug sku images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Order.countDocuments({
        "payment.status": { $ne: "completed" }
    });

    ResponseHandler.paginated(res, orders, page, limit, total, "Unpaid orders retrieved successfully");
});

// @desc    Get orders not in debt details
// @route   GET /api/v1/employee/metrics/not-in-debt
// @access  Private (Employee/Admin)
export const getOrdersNotInDebt = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Lấy tất cả invoices chưa issued
    const invoicesWithoutDebt = await Invoice.find({
        status: { $ne: "issued" }
    }).select("_id orders");

    // Lấy tất cả order IDs từ invoices
    const orderIdsFromInvoices = invoicesWithoutDebt.flatMap(inv => 
        inv.orders.map((o: any) => o.order)
    );

    // Lấy tất cả orders chưa delivered
    const undeliveredOrdersList = await Order.find({
        status: { $ne: "delivered" }
    }).select("_id");

    const allOrderIds = [
        ...orderIdsFromInvoices,
        ...undeliveredOrdersList.map(o => o._id)
    ];

    // Lấy tất cả order IDs đã có trong debt
    const debts = await Debt.find({}).select("items.order");
    const orderIdsInDebt = debts.flatMap(debt => 
        debt.items.map((item: any) => item.order)
    );

    // Tìm orders chưa có trong debt
    const ordersNotInDebtIds = allOrderIds.filter(
        orderId => !orderIdsInDebt.some(
            debtOrderId => debtOrderId.toString() === orderId.toString()
        )
    );

    const uniqueOrderIds = Array.from(new Set(ordersNotInDebtIds.map(id => id.toString())))
        .map(id => new mongoose.Types.ObjectId(id));

    const orders = await Order.find({
        _id: { $in: uniqueOrderIds }
    })
        .populate("user", "firstName lastName email phone")
        .populate("items.product", "name slug sku images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = uniqueOrderIds.length;

    ResponseHandler.paginated(res, orders, page, limit, total, "Orders not in debt retrieved successfully");
});

