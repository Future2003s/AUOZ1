"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeStatus = exports.returnProduct = exports.resolveDefective = exports.getDefectiveReports = exports.reportDefective = exports.getInventoryHistory = exports.getInventoryStats = exports.adjustStock = exports.deleteInventory = exports.updateInventory = exports.createInventory = exports.getInventory = exports.getInventories = void 0;
const inventoryService_1 = require("../services/inventoryService");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const transform_1 = require("../utils/transform");
// ═════════════════════════════════════════════════════════════════════
// CRUD (existing)
// ═════════════════════════════════════════════════════════════════════
// @desc    Get all inventory items
// @route   GET /api/v1/inventory
// @access  Private (Admin, Employee)
exports.getInventories = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page, limit, sort, order, search, location, category, lowStock, premium } = req.query;
    const filters = {
        search: search,
        location: location,
        category: category,
        lowStock: lowStock === "true",
        premium: premium === "true",
    };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort || "lastUpdated",
        order: order || "desc",
    };
    const userId = req.user?.id;
    const result = await inventoryService_1.InventoryService.getInventories(filters, query, userId);
    const transformedInventories = (0, transform_1.transformMongoDocument)(result.inventories);
    response_1.ResponseHandler.paginated(res, transformedInventories, result.pagination.page, result.pagination.limit, result.pagination.total, "Danh sách kho được lấy thành công");
});
// @desc    Get single inventory item
// @route   GET /api/v1/inventory/:id
// @access  Private (Admin, Employee)
exports.getInventory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const inventory = await inventoryService_1.InventoryService.getInventoryById(req.params.id);
    const transformedInventory = (0, transform_1.transformMongoDocument)(inventory);
    response_1.ResponseHandler.success(res, transformedInventory, "Lấy thông tin kho thành công");
});
// @desc    Create new inventory item
// @route   POST /api/v1/inventory
// @access  Private (Admin, Employee)
exports.createInventory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { sku, name, quantity, unit, netWeight, minStock, price, location, category, productId } = req.body;
    if (!sku || !name || quantity === undefined || price === undefined) {
        return next(new AppError_1.AppError("Vui lòng điền đầy đủ thông tin bắt buộc", 400));
    }
    const inventoryData = {
        sku,
        name,
        quantity: Number(quantity) || 0,
        unit: unit || "Lọ",
        netWeight: Number(netWeight) || 165,
        minStock: Number(minStock) || 10,
        price: Number(price),
        location: location || "Kho A",
        category: category || "Thường",
        productId,
    };
    const userId = req.user?.id;
    const inventory = await inventoryService_1.InventoryService.createInventory(inventoryData, userId);
    const transformedInventory = (0, transform_1.transformMongoDocument)(inventory);
    response_1.ResponseHandler.success(res, transformedInventory, "Tạo sản phẩm kho thành công", 201);
});
// @desc    Update inventory item
// @route   PUT /api/v1/inventory/:id
// @access  Private (Admin, Employee)
exports.updateInventory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { name, quantity, unit, netWeight, minStock, price, location, category } = req.body;
    const inventoryData = {};
    if (name !== undefined)
        inventoryData.name = name;
    if (quantity !== undefined)
        inventoryData.quantity = Number(quantity);
    if (unit !== undefined)
        inventoryData.unit = unit;
    if (netWeight !== undefined)
        inventoryData.netWeight = Number(netWeight);
    if (minStock !== undefined)
        inventoryData.minStock = Number(minStock);
    if (price !== undefined)
        inventoryData.price = Number(price);
    if (location !== undefined)
        inventoryData.location = location;
    if (category !== undefined)
        inventoryData.category = category;
    const userId = req.user?.id;
    const inventory = await inventoryService_1.InventoryService.updateInventory(req.params.id, inventoryData, userId);
    const transformedInventory = (0, transform_1.transformMongoDocument)(inventory);
    response_1.ResponseHandler.success(res, transformedInventory, "Cập nhật kho thành công");
});
// @desc    Delete inventory item
// @route   DELETE /api/v1/inventory/:id
// @access  Private (Admin)
exports.deleteInventory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    await inventoryService_1.InventoryService.deleteInventory(req.params.id);
    response_1.ResponseHandler.success(res, null, "Xóa kho thành công");
});
// ═════════════════════════════════════════════════════════════════════
// STOCK ADJUSTMENT (existing)
// ═════════════════════════════════════════════════════════════════════
// @desc    Adjust stock (import/export)
// @route   POST /api/v1/inventory/:id/adjust
// @access  Private (Admin, Employee)
exports.adjustStock = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { type, amount, partner, reason } = req.body;
    if (!type || !amount) {
        return next(new AppError_1.AppError("Vui lòng cung cấp loại giao dịch và số lượng", 400));
    }
    if (type !== "import" && type !== "export") {
        return next(new AppError_1.AppError("Loại giao dịch không hợp lệ", 400));
    }
    if (Number(amount) <= 0) {
        return next(new AppError_1.AppError("Số lượng phải lớn hơn 0", 400));
    }
    const userId = req.user?.id;
    const result = await inventoryService_1.InventoryService.adjustStock({
        inventoryId: req.params.id,
        type,
        amount: Number(amount),
        partner,
        reason,
    }, userId);
    const transformedInventory = (0, transform_1.transformMongoDocument)(result.inventory);
    const transformedHistory = (0, transform_1.transformMongoDocument)(result.history);
    response_1.ResponseHandler.success(res, { inventory: transformedInventory, history: transformedHistory }, "Điều chỉnh kho thành công");
});
// ═════════════════════════════════════════════════════════════════════
// STATS (enhanced)
// ═════════════════════════════════════════════════════════════════════
// @desc    Get inventory statistics (enhanced)
// @route   GET /api/v1/inventory/stats
// @access  Private (Admin, Employee)
exports.getInventoryStats = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const stats = await inventoryService_1.InventoryService.getEnhancedStats();
    response_1.ResponseHandler.success(res, stats, "Lấy thống kê kho thành công");
});
// ═════════════════════════════════════════════════════════════════════
// HISTORY (existing)
// ═════════════════════════════════════════════════════════════════════
// @desc    Get inventory history
// @route   GET /api/v1/inventory/history
// @access  Private (Admin, Employee)
exports.getInventoryHistory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page, limit, sort, order, inventoryId, type, search, dateFrom, dateTo } = req.query;
    const filters = {
        inventoryId: inventoryId,
        type: type,
        search: search,
        dateFrom: dateFrom,
        dateTo: dateTo,
    };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort || "createdAt",
        order: order || "desc",
    };
    const result = await inventoryService_1.InventoryService.getInventoryHistory(filters, query);
    const transformedHistory = (0, transform_1.transformMongoDocument)(result.history);
    response_1.ResponseHandler.paginated(res, transformedHistory, result.pagination.page, result.pagination.limit, result.pagination.total, "Lấy lịch sử kho thành công");
});
// ═════════════════════════════════════════════════════════════════════
// DEFECTIVE REPORT (NEW)
// ═════════════════════════════════════════════════════════════════════
// @desc    Report defective products
// @route   POST /api/v1/inventory/:id/defective
// @access  Private (Admin, Employee)
exports.reportDefective = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { quantity, reason, images, severity } = req.body;
    if (!quantity || !reason) {
        return next(new AppError_1.AppError("Vui lòng cung cấp số lượng và lý do", 400));
    }
    if (Number(quantity) <= 0) {
        return next(new AppError_1.AppError("Số lượng phải lớn hơn 0", 400));
    }
    const userId = req.user?.id;
    if (!userId) {
        return next(new AppError_1.AppError("User ID không tồn tại", 401));
    }
    const result = await inventoryService_1.InventoryService.reportDefective({
        inventoryId: req.params.id,
        quantity: Number(quantity),
        reason,
        images: images || [],
        severity: severity || "medium",
    }, userId);
    response_1.ResponseHandler.success(res, {
        inventory: (0, transform_1.transformMongoDocument)(result.inventory),
        report: (0, transform_1.transformMongoDocument)(result.report),
        history: (0, transform_1.transformMongoDocument)(result.history),
    }, "Báo hàng lỗi thành công", 201);
});
// @desc    Get defective reports
// @route   GET /api/v1/inventory/defective-reports
// @access  Private (Admin, Employee)
exports.getDefectiveReports = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page, limit, sort, order, inventoryId, status, severity, search, dateFrom, dateTo } = req.query;
    const filters = {
        inventoryId: inventoryId,
        status: status,
        severity: severity,
        search: search,
        dateFrom: dateFrom,
        dateTo: dateTo,
    };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort || "createdAt",
        order: order || "desc",
    };
    const result = await inventoryService_1.InventoryService.getDefectiveReports(filters, query);
    const transformedReports = (0, transform_1.transformMongoDocument)(result.reports);
    response_1.ResponseHandler.paginated(res, transformedReports, result.pagination.page, result.pagination.limit, result.pagination.total, "Lấy danh sách báo cáo hàng lỗi thành công");
});
// @desc    Resolve a defective report
// @route   POST /api/v1/inventory/defective-reports/:id/resolve
// @access  Private (Admin)
exports.resolveDefective = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { resolution, resolvedQuantity, resolutionNote } = req.body;
    if (!resolution || !resolvedQuantity) {
        return next(new AppError_1.AppError("Vui lòng cung cấp quyết định xử lý và số lượng", 400));
    }
    const validResolutions = ["repaired", "destroyed", "returned_to_supplier"];
    if (!validResolutions.includes(resolution)) {
        return next(new AppError_1.AppError("Quyết định xử lý không hợp lệ", 400));
    }
    if (Number(resolvedQuantity) <= 0) {
        return next(new AppError_1.AppError("Số lượng xử lý phải lớn hơn 0", 400));
    }
    const userId = req.user?.id;
    if (!userId) {
        return next(new AppError_1.AppError("User ID không tồn tại", 401));
    }
    const result = await inventoryService_1.InventoryService.resolveDefective(req.params.id, {
        resolution,
        resolvedQuantity: Number(resolvedQuantity),
        resolutionNote,
    }, userId);
    response_1.ResponseHandler.success(res, {
        inventory: (0, transform_1.transformMongoDocument)(result.inventory),
        report: (0, transform_1.transformMongoDocument)(result.report),
        history: (0, transform_1.transformMongoDocument)(result.history),
    }, "Xử lý báo cáo hàng lỗi thành công");
});
// ═════════════════════════════════════════════════════════════════════
// RETURN PRODUCT (NEW)
// ═════════════════════════════════════════════════════════════════════
// @desc    Record a product return
// @route   POST /api/v1/inventory/:id/return
// @access  Private (Admin, Employee)
exports.returnProduct = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { quantity, reason } = req.body;
    if (!quantity || !reason) {
        return next(new AppError_1.AppError("Vui lòng cung cấp số lượng và lý do trả hàng", 400));
    }
    if (Number(quantity) <= 0) {
        return next(new AppError_1.AppError("Số lượng phải lớn hơn 0", 400));
    }
    const userId = req.user?.id;
    if (!userId) {
        return next(new AppError_1.AppError("User ID không tồn tại", 401));
    }
    const result = await inventoryService_1.InventoryService.returnProduct({
        inventoryId: req.params.id,
        quantity: Number(quantity),
        reason,
    }, userId);
    response_1.ResponseHandler.success(res, {
        inventory: (0, transform_1.transformMongoDocument)(result.inventory),
        history: (0, transform_1.transformMongoDocument)(result.history),
    }, "Ghi nhận trả hàng thành công", 201);
});
// ═════════════════════════════════════════════════════════════════════
// STATUS CHANGE (NEW)
// ═════════════════════════════════════════════════════════════════════
// @desc    Change product status in inventory
// @route   POST /api/v1/inventory/:id/status-change
// @access  Private (Admin, Employee)
exports.changeStatus = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { quantity, fromStatus, toStatus, reason } = req.body;
    if (!quantity || !fromStatus || !toStatus) {
        return next(new AppError_1.AppError("Vui lòng cung cấp số lượng, trạng thái nguồn và đích", 400));
    }
    if (Number(quantity) <= 0) {
        return next(new AppError_1.AppError("Số lượng phải lớn hơn 0", 400));
    }
    const userId = req.user?.id;
    if (!userId) {
        return next(new AppError_1.AppError("User ID không tồn tại", 401));
    }
    const result = await inventoryService_1.InventoryService.changeStatus({
        inventoryId: req.params.id,
        quantity: Number(quantity),
        fromStatus,
        toStatus,
        reason,
    }, userId);
    response_1.ResponseHandler.success(res, {
        inventory: (0, transform_1.transformMongoDocument)(result.inventory),
        history: (0, transform_1.transformMongoDocument)(result.history),
    }, "Chuyển trạng thái thành công");
});
