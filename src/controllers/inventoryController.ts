import { Request, Response, NextFunction } from "express";
import { InventoryService } from "../services/inventoryService";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { transformMongoDocument } from "../utils/transform";

// @desc    Get all inventory items
// @route   GET /api/v1/inventory
// @access  Private (Admin, Employee)
export const getInventories = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const {
            page,
            limit,
            sort,
            order,
            search,
            location,
            category,
            lowStock,
            premium,
        } = req.query;

        const filters = {
            search: search as string,
            location: location as string,
            category: category as string,
            lowStock: lowStock === "true",
            premium: premium === "true",
        };

        const query = {
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            sort: (sort as string) || "lastUpdated",
            order: (order as "asc" | "desc") || "desc",
        };

        const userId = (req as any).user?.id;

        const result = await InventoryService.getInventories(filters, query, userId);

        // Transform MongoDB documents: _id -> id
        const transformedInventories = transformMongoDocument(result.inventories);

        ResponseHandler.paginated(
            res,
            transformedInventories,
            result.pagination.page,
            result.pagination.limit,
            result.pagination.total,
            "Danh sách kho mật ong được lấy thành công"
        );
    }
);

// @desc    Get single inventory item
// @route   GET /api/v1/inventory/:id
// @access  Private (Admin, Employee)
export const getInventory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const inventory = await InventoryService.getInventoryById(req.params.id);

        // Transform MongoDB document: _id -> id
        const transformedInventory = transformMongoDocument(inventory);

        ResponseHandler.success(res, transformedInventory, "Lấy thông tin kho mật ong thành công");
    }
);

// @desc    Create new inventory item
// @route   POST /api/v1/inventory
// @access  Private (Admin, Employee)
export const createInventory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const {
            name,
            quantity,
            unit,
            netWeight,
            minStock,
            price,
            location,
            category,
        } = req.body;

        // Validate required fields
        if (!name || quantity === undefined || !price) {
            return next(new AppError("Vui lòng điền đầy đủ thông tin bắt buộc", 400));
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

        const userId = (req as any).user?.id;
        const inventory = await InventoryService.createInventory(inventoryData, userId);

        // Transform MongoDB document: _id -> id
        const transformedInventory = transformMongoDocument(inventory);

        ResponseHandler.success(res, transformedInventory, "Tạo sản phẩm kho mật ong thành công", 201);
    }
);

// @desc    Update inventory item
// @route   PUT /api/v1/inventory/:id
// @access  Private (Admin, Employee)
export const updateInventory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const {
            name,
            quantity,
            unit,
            netWeight,
            minStock,
            price,
            location,
            category,
        } = req.body;

        const inventoryData: any = {};

        if (name !== undefined) inventoryData.name = name;
        if (quantity !== undefined) inventoryData.quantity = Number(quantity);
        if (unit !== undefined) inventoryData.unit = unit;
        if (netWeight !== undefined) inventoryData.netWeight = Number(netWeight);
        if (minStock !== undefined) inventoryData.minStock = Number(minStock);
        if (price !== undefined) inventoryData.price = Number(price);
        if (location !== undefined) inventoryData.location = location;
        if (category !== undefined) inventoryData.category = category;

        const userId = (req as any).user?.id;
        const inventory = await InventoryService.updateInventory(
            req.params.id,
            inventoryData,
            userId
        );

        // Transform MongoDB document: _id -> id
        const transformedInventory = transformMongoDocument(inventory);

        ResponseHandler.success(res, transformedInventory, "Cập nhật kho mật ong thành công");
    }
);

// @desc    Delete inventory item
// @route   DELETE /api/v1/inventory/:id
// @access  Private (Admin)
export const deleteInventory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        await InventoryService.deleteInventory(req.params.id);

        ResponseHandler.success(res, null, "Xóa kho mật ong thành công");
    }
);

// @desc    Adjust stock (import/export)
// @route   POST /api/v1/inventory/:id/adjust
// @access  Private (Admin, Employee)
export const adjustStock = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { type, amount, partner } = req.body;

        if (!type || !amount) {
            return next(new AppError("Vui lòng cung cấp loại giao dịch và số lượng", 400));
        }

        if (type !== "import" && type !== "export") {
            return next(new AppError("Loại giao dịch không hợp lệ", 400));
        }

        if (Number(amount) <= 0) {
            return next(new AppError("Số lượng phải lớn hơn 0", 400));
        }

        const userId = (req as any).user?.id;
        const result = await InventoryService.adjustStock(
            {
                inventoryId: req.params.id,
                type,
                amount: Number(amount),
                partner,
            },
            userId
        );

        // Transform MongoDB documents: _id -> id
        const transformedInventory = transformMongoDocument(result.inventory);
        const transformedHistory = transformMongoDocument(result.history);

        ResponseHandler.success(
            res,
            {
                inventory: transformedInventory,
                history: transformedHistory,
            },
            "Điều chỉnh kho thành công"
        );
    }
);

// @desc    Get inventory statistics
// @route   GET /api/v1/inventory/stats
// @access  Private (Admin, Employee)
export const getInventoryStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const stats = await InventoryService.getInventoryStats();

        ResponseHandler.success(res, stats, "Lấy thống kê kho thành công");
    }
);

// @desc    Get inventory history
// @route   GET /api/v1/inventory/history
// @access  Private (Admin, Employee)
export const getInventoryHistory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { page, limit, sort, order, inventoryId, type, search } = req.query;

        const filters = {
            inventoryId: inventoryId as string,
            type: type as string,
            search: search as string,
        };

        const query = {
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            sort: (sort as string) || "createdAt",
            order: (order as "asc" | "desc") || "desc",
        };

        const result = await InventoryService.getInventoryHistory(filters, query);

        // Transform MongoDB documents: _id -> id
        const transformedHistory = transformMongoDocument(result.history);

        ResponseHandler.paginated(
            res,
            transformedHistory,
            result.pagination.page,
            result.pagination.limit,
            result.pagination.total,
            "Lấy lịch sử kho thành công"
        );
    }
);
