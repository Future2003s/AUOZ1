"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrdersNotInDebt = exports.getUnpaidOrders = exports.getUndeliveredOrders = exports.getIncompleteInvoices = exports.getEmployeeMetrics = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const Invoice_1 = require("../models/Invoice");
const Order_1 = require("../models/Order");
const Debt_1 = require("../models/Debt");
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Get employee dashboard metrics
// @route   GET /api/v1/employee/metrics
// @access  Private (Employee/Admin)
exports.getEmployeeMetrics = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    // 1. Hóa đơn chưa hoàn thành (invoice status != "issued")
    const incompleteInvoices = await Invoice_1.Invoice.countDocuments({
        status: { $ne: "issued" }
    });
    // 2. Đơn chưa nhận được hàng (order status != "delivered")
    const undeliveredOrders = await Order_1.Order.countDocuments({
        status: { $ne: "delivered" }
    });
    // 3. Đơn chưa thanh toán (order payment.status != "completed")
    const unpaidOrders = await Order_1.Order.countDocuments({
        "payment.status": { $ne: "completed" }
    });
    // 4. Chưa vào công nợ (invoice/order chưa có debt record)
    // Lấy tất cả invoices chưa issued
    const invoicesWithoutDebt = await Invoice_1.Invoice.find({
        status: { $ne: "issued" }
    }).select("_id orders");
    // Lấy tất cả order IDs từ invoices
    const orderIdsFromInvoices = invoicesWithoutDebt.flatMap(inv => inv.orders.map((o) => o.order));
    // Lấy tất cả orders chưa delivered
    const undeliveredOrdersList = await Order_1.Order.find({
        status: { $ne: "delivered" }
    }).select("_id");
    const allOrderIds = [
        ...orderIdsFromInvoices,
        ...undeliveredOrdersList.map(o => o._id)
    ];
    // Lấy tất cả order IDs đã có trong debt
    const debts = await Debt_1.Debt.find({}).select("items.order");
    const orderIdsInDebt = debts.flatMap(debt => debt.items.map((item) => item.order));
    // Đếm orders chưa có trong debt
    const ordersNotInDebt = allOrderIds.filter(orderId => !orderIdsInDebt.some(debtOrderId => debtOrderId.toString() === orderId.toString()));
    const notInDebtCount = new Set(ordersNotInDebt.map(id => id.toString())).size;
    const metrics = {
        incompleteInvoices,
        undeliveredOrders,
        unpaidOrders,
        notInDebt: notInDebtCount
    };
    response_1.ResponseHandler.success(res, metrics, "Metrics retrieved successfully");
});
// @desc    Get incomplete invoices details
// @route   GET /api/v1/employee/metrics/incomplete-invoices
// @access  Private (Employee/Admin)
exports.getIncompleteInvoices = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const invoices = await Invoice_1.Invoice.find({
        status: { $ne: "issued" }
    })
        .populate("customer", "firstName lastName email phone")
        .populate("orders.order", "orderNumber status total createdAt")
        .sort({ deadline: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await Invoice_1.Invoice.countDocuments({
        status: { $ne: "issued" }
    });
    response_1.ResponseHandler.paginated(res, invoices, page, limit, total, "Incomplete invoices retrieved successfully");
});
// @desc    Get undelivered orders details
// @route   GET /api/v1/employee/metrics/undelivered-orders
// @access  Private (Employee/Admin)
exports.getUndeliveredOrders = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const orders = await Order_1.Order.find({
        status: { $ne: "delivered" }
    })
        .populate("user", "firstName lastName email phone")
        .populate("items.product", "name slug sku images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await Order_1.Order.countDocuments({
        status: { $ne: "delivered" }
    });
    response_1.ResponseHandler.paginated(res, orders, page, limit, total, "Undelivered orders retrieved successfully");
});
// @desc    Get unpaid orders details
// @route   GET /api/v1/employee/metrics/unpaid-orders
// @access  Private (Employee/Admin)
exports.getUnpaidOrders = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const orders = await Order_1.Order.find({
        "payment.status": { $ne: "completed" }
    })
        .populate("user", "firstName lastName email phone")
        .populate("items.product", "name slug sku images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await Order_1.Order.countDocuments({
        "payment.status": { $ne: "completed" }
    });
    response_1.ResponseHandler.paginated(res, orders, page, limit, total, "Unpaid orders retrieved successfully");
});
// @desc    Get orders not in debt details
// @route   GET /api/v1/employee/metrics/not-in-debt
// @access  Private (Employee/Admin)
exports.getOrdersNotInDebt = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    // Lấy tất cả invoices chưa issued
    const invoicesWithoutDebt = await Invoice_1.Invoice.find({
        status: { $ne: "issued" }
    }).select("_id orders");
    // Lấy tất cả order IDs từ invoices
    const orderIdsFromInvoices = invoicesWithoutDebt.flatMap(inv => inv.orders.map((o) => o.order));
    // Lấy tất cả orders chưa delivered
    const undeliveredOrdersList = await Order_1.Order.find({
        status: { $ne: "delivered" }
    }).select("_id");
    const allOrderIds = [
        ...orderIdsFromInvoices,
        ...undeliveredOrdersList.map(o => o._id)
    ];
    // Lấy tất cả order IDs đã có trong debt
    const debts = await Debt_1.Debt.find({}).select("items.order");
    const orderIdsInDebt = debts.flatMap(debt => debt.items.map((item) => item.order));
    // Tìm orders chưa có trong debt
    const ordersNotInDebtIds = allOrderIds.filter(orderId => !orderIdsInDebt.some(debtOrderId => debtOrderId.toString() === orderId.toString()));
    const uniqueOrderIds = Array.from(new Set(ordersNotInDebtIds.map(id => id.toString())))
        .map(id => new mongoose_1.default.Types.ObjectId(id));
    const orders = await Order_1.Order.find({
        _id: { $in: uniqueOrderIds }
    })
        .populate("user", "firstName lastName email phone")
        .populate("items.product", "name slug sku images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = uniqueOrderIds.length;
    response_1.ResponseHandler.paginated(res, orders, page, limit, total, "Orders not in debt retrieved successfully");
});
