"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInvoice = exports.uploadInvoiceFile = exports.remindInvoice = exports.issueInvoice = exports.createInvoice = exports.getInvoice = exports.getAllInvoices = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const Invoice_1 = require("../models/Invoice");
const Order_1 = require("../models/Order");
const cloudinary_1 = require("../utils/cloudinary");
// @desc    Get all invoice reminders with filters
// @route   GET /api/v1/invoice
// @access  Private (Employee/Admin)
exports.getAllInvoices = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const customerId = req.query.customerId;
    const query = {};
    if (status) {
        query.status = status;
    }
    if (customerId) {
        query.customer = customerId;
    }
    const skip = (page - 1) * limit;
    const invoices = await Invoice_1.Invoice.find(query)
        .populate("customer", "firstName lastName email phone")
        .populate("orders.order", "orderNumber status total createdAt")
        .sort({ deadline: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await Invoice_1.Invoice.countDocuments(query);
    response_1.ResponseHandler.paginated(res, invoices, page, limit, total, "Invoices retrieved successfully");
});
// @desc    Get invoice by ID
// @route   GET /api/v1/invoice/:id
// @access  Private (Employee/Admin)
exports.getInvoice = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const invoice = await Invoice_1.Invoice.findById(id)
        .populate("customer", "firstName lastName email phone")
        .populate("orders.order", "orderNumber status total createdAt")
        .populate("history.updatedBy", "firstName lastName email")
        .lean();
    if (!invoice) {
        return next(new AppError_1.AppError("Invoice not found", 404));
    }
    response_1.ResponseHandler.success(res, invoice, "Invoice retrieved successfully");
});
// @desc    Create invoice reminder
// @route   POST /api/v1/invoice
// @access  Private (Employee/Admin)
exports.createInvoice = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { customerId, customerName, customerPhone, customerEmail, orderIds, deadline, notes } = req.body;
    const userId = req.user?.id;
    if (!customerId || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0 || !deadline) {
        return next(new AppError_1.AppError("Customer ID, order IDs, and deadline are required", 400));
    }
    // Fetch orders
    const orders = await Order_1.Order.find({ _id: { $in: orderIds } });
    if (orders.length !== orderIds.length) {
        return next(new AppError_1.AppError("Some orders not found", 404));
    }
    // Check if invoice already exists for these orders
    const existingInvoice = await Invoice_1.Invoice.findOne({
        customer: customerId,
        "orders.order": { $in: orderIds },
        status: { $ne: "issued" }
    });
    if (existingInvoice) {
        return next(new AppError_1.AppError("Invoice reminder already exists for these orders", 400));
    }
    const orderInfos = orders.map(order => ({
        order: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
        orderDate: order.createdAt
    }));
    const invoice = new Invoice_1.Invoice({
        customer: customerId,
        customerName: customerName || `${orders[0].shippingAddress?.firstName || ""} ${orders[0].shippingAddress?.lastName || ""}`.trim(),
        customerPhone: customerPhone || orders[0].shippingAddress?.phone,
        customerEmail: customerEmail,
        orders: orderInfos,
        deadline: new Date(deadline),
        notes,
        status: "pending",
        createdBy: userId
    });
    invoice.calculateTotal();
    invoice.updateStatus();
    invoice.addHistory("created", userId, "Invoice reminder created");
    await invoice.save();
    const populatedInvoice = await Invoice_1.Invoice.findById(invoice._id)
        .populate("customer", "firstName lastName email phone")
        .populate("orders.order", "orderNumber status total createdAt");
    response_1.ResponseHandler.created(res, populatedInvoice, "Invoice reminder created successfully");
});
// @desc    Issue invoice
// @route   PUT /api/v1/invoice/:id/issue
// @access  Private (Employee/Admin)
exports.issueInvoice = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { invoiceNumber, invoiceDate, notes } = req.body;
    const userId = req.user?.id;
    const invoice = await Invoice_1.Invoice.findById(id);
    if (!invoice) {
        return next(new AppError_1.AppError("Invoice not found", 404));
    }
    if (invoice.status === "issued") {
        return next(new AppError_1.AppError("Invoice already issued", 400));
    }
    if (!invoiceNumber) {
        // Generate invoice number if not provided
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        invoice.invoiceNumber = `INV-${timestamp}-${random}`;
    }
    else {
        invoice.invoiceNumber = invoiceNumber;
    }
    invoice.invoiceDate = invoiceDate ? new Date(invoiceDate) : new Date();
    invoice.issuedAt = new Date();
    if (notes) {
        invoice.notes = notes;
    }
    invoice.updateStatus();
    invoice.addHistory("issued", userId, notes || "Invoice issued", invoice.invoiceNumber);
    await invoice.save();
    const populatedInvoice = await Invoice_1.Invoice.findById(invoice._id)
        .populate("customer", "firstName lastName email phone")
        .populate("orders.order", "orderNumber status total createdAt");
    response_1.ResponseHandler.success(res, populatedInvoice, "Invoice issued successfully");
});
// @desc    Mark invoice as reminded
// @route   PUT /api/v1/invoice/:id/remind
// @access  Private (Employee/Admin)
exports.remindInvoice = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user?.id;
    const invoice = await Invoice_1.Invoice.findById(id);
    if (!invoice) {
        return next(new AppError_1.AppError("Invoice not found", 404));
    }
    invoice.remindedAt = new Date();
    invoice.updateStatus();
    invoice.addHistory("reminded", userId, notes || "Customer reminded");
    await invoice.save();
    response_1.ResponseHandler.success(res, invoice, "Invoice reminder sent successfully");
});
// @desc    Upload invoice file
// @route   POST /api/v1/invoice/:id/upload
// @access  Private (Employee/Admin)
exports.uploadInvoiceFile = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { type } = req.body; // "invoice" or "vat"
    const file = req.file;
    if (!file) {
        return next(new AppError_1.AppError("No file uploaded", 400));
    }
    const invoice = await Invoice_1.Invoice.findById(id);
    if (!invoice) {
        return next(new AppError_1.AppError("Invoice not found", 404));
    }
    // Upload to Cloudinary
    const timestamp = Date.now();
    const publicId = `invoices/${id}-${type || "invoice"}-${timestamp}`;
    const cloudinaryResult = await (0, cloudinary_1.uploadToCloudinary)(file.buffer, {
        folder: "invoices",
        public_id: publicId,
        resource_type: file.mimetype.includes("pdf") ? "raw" : "image"
    });
    if (type === "vat") {
        invoice.invoiceVAT = cloudinaryResult.secure_url;
    }
    else {
        invoice.invoiceFile = cloudinaryResult.secure_url;
    }
    await invoice.save();
    response_1.ResponseHandler.success(res, {
        fileUrl: cloudinaryResult.secure_url,
        type: type || "invoice"
    }, "Invoice file uploaded successfully");
});
// @desc    Update invoice
// @route   PUT /api/v1/invoice/:id
// @access  Private (Employee/Admin)
exports.updateInvoice = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { id } = req.params;
    const { deadline, notes } = req.body;
    const userId = req.user?.id;
    const invoice = await Invoice_1.Invoice.findById(id);
    if (!invoice) {
        return next(new AppError_1.AppError("Invoice not found", 404));
    }
    if (deadline) {
        invoice.deadline = new Date(deadline);
    }
    if (notes !== undefined) {
        invoice.notes = notes;
        invoice.addHistory("note_added", userId, notes);
    }
    invoice.updateStatus();
    invoice.updatedBy = userId;
    await invoice.save();
    const populatedInvoice = await Invoice_1.Invoice.findById(invoice._id)
        .populate("customer", "firstName lastName email phone")
        .populate("orders.order", "orderNumber status total createdAt");
    response_1.ResponseHandler.success(res, populatedInvoice, "Invoice updated successfully");
});
