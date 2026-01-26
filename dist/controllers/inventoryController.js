"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryHistory = exports.getInventoryStats = exports.adjustStock = exports.deleteInventory = exports.updateInventory = exports.createInventory = exports.getInventory = exports.getInventories = void 0;
const inventoryService_1 = require("../services/inventoryService");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const AppError_1 = require("../utils/AppError");
const transform_1 = require("../utils/transform");
// @desc    Get all inventory items
// @route   GET /api/v1/inventory
// @access  Private (Admin, Employee)
exports.getInventories = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page, limit, sort, order, search, location, category, lowStock, premium, } = req.query;
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
    // Transform MongoDB documents: _id -> id
    const transformedInventories = (0, transform_1.transformMongoDocument)(result.inventories);
    response_1.ResponseHandler.paginated(res, transformedInventories, result.pagination.page, result.pagination.limit, result.pagination.total, "Danh sách kho mật ong được lấy thành công");
});
// @desc    Get single inventory item
// @route   GET /api/v1/inventory/:id
// @access  Private (Admin, Employee)
exports.getInventory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const inventory = await inventoryService_1.InventoryService.getInventoryById(req.params.id);
    // Transform MongoDB document: _id -> id
    const transformedInventory = (0, transform_1.transformMongoDocument)(inventory);
    response_1.ResponseHandler.success(res, transformedInventory, "Lấy thông tin kho mật ong thành công");
});
// @desc    Create new inventory item
// @route   POST /api/v1/inventory
// @access  Private (Admin, Employee)
exports.createInventory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { name, quantity, unit, netWeight, minStock, price, location, category, } = req.body;
    // Validate required fields
    if (!name || quantity === undefined || !price) {
        return next(new AppError_1.AppError("Vui lòng điền đầy đủ thông tin bắt buộc", 400));
    }
    const inventoryData = {
        name,
        quantity: Number(quantity) || 0,
        unit: unit || "Lọ",
        netWeight: Number(netWeight) || 165,
        minStock: Number(minStock) || 10,
        price: Number(price),
        location: location || "Kho A",
        category: category || "Thường",
    };
    const userId = req.user?.id;
    const inventory = await inventoryService_1.InventoryService.createInventory(inventoryData, userId);
    // Transform MongoDB document: _id -> id
    const transformedInventory = (0, transform_1.transformMongoDocument)(inventory);
    response_1.ResponseHandler.success(res, transformedInventory, "Tạo sản phẩm kho mật ong thành công", 201);
});
// @desc    Update inventory item
// @route   PUT /api/v1/inventory/:id
// @access  Private (Admin, Employee)
exports.updateInventory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { name, quantity, unit, netWeight, minStock, price, location, category, } = req.body;
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
    // Transform MongoDB document: _id -> id
    const transformedInventory = (0, transform_1.transformMongoDocument)(inventory);
    response_1.ResponseHandler.success(res, transformedInventory, "Cập nhật kho mật ong thành công");
});
// @desc    Delete inventory item
// @route   DELETE /api/v1/inventory/:id
// @access  Private (Admin)
exports.deleteInventory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    await inventoryService_1.InventoryService.deleteInventory(req.params.id);
    response_1.ResponseHandler.success(res, null, "Xóa kho mật ong thành công");
});
// @desc    Adjust stock (import/export)
// @route   POST /api/v1/inventory/:id/adjust
// @access  Private (Admin, Employee)
exports.adjustStock = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { type, amount, partner } = req.body;
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
    }, userId);
    // Transform MongoDB documents: _id -> id
    const transformedInventory = (0, transform_1.transformMongoDocument)(result.inventory);
    const transformedHistory = (0, transform_1.transformMongoDocument)(result.history);
    response_1.ResponseHandler.success(res, {
        inventory: transformedInventory,
        history: transformedHistory,
    }, "Điều chỉnh kho thành công");
});
// @desc    Get inventory statistics
// @route   GET /api/v1/inventory/stats
// @access  Private (Admin, Employee)
exports.getInventoryStats = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const stats = await inventoryService_1.InventoryService.getInventoryStats();
    response_1.ResponseHandler.success(res, stats, "Lấy thống kê kho thành công");
});
// @desc    Get inventory history
// @route   GET /api/v1/inventory/history
// @access  Private (Admin, Employee)
exports.getInventoryHistory = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { page, limit, sort, order, inventoryId, type, search } = req.query;
    const filters = {
        inventoryId: inventoryId,
        type: type,
        search: search,
    };
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sort: sort || "createdAt",
        order: order || "desc",
    };
    const result = await inventoryService_1.InventoryService.getInventoryHistory(filters, query);
    // Transform MongoDB documents: _id -> id
    const transformedHistory = (0, transform_1.transformMongoDocument)(result.history);
    response_1.ResponseHandler.paginated(res, transformedHistory, result.pagination.page, result.pagination.limit, result.pagination.total, "Lấy lịch sử kho thành công");
});
