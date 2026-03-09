import { Request, Response, NextFunction } from "express";
import { InventoryService } from "../services/inventoryService";
import { asyncHandler } from "../utils/asyncHandler";
import { ResponseHandler } from "../utils/response";
import { AppError } from "../utils/AppError";
import { transformMongoDocument } from "../utils/transform";

// ═════════════════════════════════════════════════════════════════════
// CRUD (existing)
// ═════════════════════════════════════════════════════════════════════

// @desc    Get all inventory items
// @route   GET /api/v1/inventory
// @access  Private (Admin, Employee)
export const getInventories = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { page, limit, sort, order, search, location, category, lowStock, premium } =
            req.query;

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

        const transformedInventories = transformMongoDocument(result.inventories);

        ResponseHandler.paginated(
            res,
            transformedInventories,
            result.pagination.page,
            result.pagination.limit,
            result.pagination.total,
            "Danh sách kho được lấy thành công"
        );
    }
);

// @desc    Get single inventory item
// @route   GET /api/v1/inventory/:id
// @access  Private (Admin, Employee)
export const getInventory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const inventory = await InventoryService.getInventoryById(req.params.id);
        const transformedInventory = transformMongoDocument(inventory);
        ResponseHandler.success(res, transformedInventory, "Lấy thông tin kho thành công");
    }
);

// @desc    Create new inventory item
// @route   POST /api/v1/inventory
// @access  Private (Admin, Employee)
export const createInventory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { name, quantity, unit, netWeight, minStock, price, location, category, productId } =
            req.body;

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
            productId,
        };

        const userId = (req as any).user?.id;
        const inventory = await InventoryService.createInventory(inventoryData, userId);
        const transformedInventory = transformMongoDocument(inventory);

        ResponseHandler.success(res, transformedInventory, "Tạo sản phẩm kho thành công", 201);
    }
);

// @desc    Update inventory item
// @route   PUT /api/v1/inventory/:id
// @access  Private (Admin, Employee)
export const updateInventory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { name, quantity, unit, netWeight, minStock, price, location, category } = req.body;

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

        const transformedInventory = transformMongoDocument(inventory);
        ResponseHandler.success(res, transformedInventory, "Cập nhật kho thành công");
    }
);

// @desc    Delete inventory item
// @route   DELETE /api/v1/inventory/:id
// @access  Private (Admin)
export const deleteInventory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        await InventoryService.deleteInventory(req.params.id);
        ResponseHandler.success(res, null, "Xóa kho thành công");
    }
);

// ═════════════════════════════════════════════════════════════════════
// STOCK ADJUSTMENT (existing)
// ═════════════════════════════════════════════════════════════════════

// @desc    Adjust stock (import/export)
// @route   POST /api/v1/inventory/:id/adjust
// @access  Private (Admin, Employee)
export const adjustStock = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { type, amount, partner, reason } = req.body;

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
                reason,
            },
            userId
        );

        const transformedInventory = transformMongoDocument(result.inventory);
        const transformedHistory = transformMongoDocument(result.history);

        ResponseHandler.success(
            res,
            { inventory: transformedInventory, history: transformedHistory },
            "Điều chỉnh kho thành công"
        );
    }
);

// ═════════════════════════════════════════════════════════════════════
// STATS (enhanced)
// ═════════════════════════════════════════════════════════════════════

// @desc    Get inventory statistics (enhanced)
// @route   GET /api/v1/inventory/stats
// @access  Private (Admin, Employee)
export const getInventoryStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const stats = await InventoryService.getEnhancedStats();
        ResponseHandler.success(res, stats, "Lấy thống kê kho thành công");
    }
);

// ═════════════════════════════════════════════════════════════════════
// HISTORY (existing)
// ═════════════════════════════════════════════════════════════════════

// @desc    Get inventory history
// @route   GET /api/v1/inventory/history
// @access  Private (Admin, Employee)
export const getInventoryHistory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { page, limit, sort, order, inventoryId, type, search, dateFrom, dateTo } = req.query;

        const filters = {
            inventoryId: inventoryId as string,
            type: type as string,
            search: search as string,
            dateFrom: dateFrom as string,
            dateTo: dateTo as string,
        };

        const query = {
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            sort: (sort as string) || "createdAt",
            order: (order as "asc" | "desc") || "desc",
        };

        const result = await InventoryService.getInventoryHistory(filters, query);
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

// ═════════════════════════════════════════════════════════════════════
// DEFECTIVE REPORT (NEW)
// ═════════════════════════════════════════════════════════════════════

// @desc    Report defective products
// @route   POST /api/v1/inventory/:id/defective
// @access  Private (Admin, Employee)
export const reportDefective = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { quantity, reason, images, severity } = req.body;

        if (!quantity || !reason) {
            return next(new AppError("Vui lòng cung cấp số lượng và lý do", 400));
        }

        if (Number(quantity) <= 0) {
            return next(new AppError("Số lượng phải lớn hơn 0", 400));
        }

        const userId = (req as any).user?.id;
        if (!userId) {
            return next(new AppError("User ID không tồn tại", 401));
        }

        const result = await InventoryService.reportDefective(
            {
                inventoryId: req.params.id,
                quantity: Number(quantity),
                reason,
                images: images || [],
                severity: severity || "medium",
            },
            userId
        );

        ResponseHandler.success(
            res,
            {
                inventory: transformMongoDocument(result.inventory),
                report: transformMongoDocument(result.report),
                history: transformMongoDocument(result.history),
            },
            "Báo hàng lỗi thành công",
            201
        );
    }
);

// @desc    Get defective reports
// @route   GET /api/v1/inventory/defective-reports
// @access  Private (Admin, Employee)
export const getDefectiveReports = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { page, limit, sort, order, inventoryId, status, severity, search, dateFrom, dateTo } =
            req.query;

        const filters = {
            inventoryId: inventoryId as string,
            status: status as string,
            severity: severity as string,
            search: search as string,
            dateFrom: dateFrom as string,
            dateTo: dateTo as string,
        };

        const query = {
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            sort: (sort as string) || "createdAt",
            order: (order as "asc" | "desc") || "desc",
        };

        const result = await InventoryService.getDefectiveReports(filters, query);
        const transformedReports = transformMongoDocument(result.reports);

        ResponseHandler.paginated(
            res,
            transformedReports,
            result.pagination.page,
            result.pagination.limit,
            result.pagination.total,
            "Lấy danh sách báo cáo hàng lỗi thành công"
        );
    }
);

// @desc    Resolve a defective report
// @route   POST /api/v1/inventory/defective-reports/:id/resolve
// @access  Private (Admin)
export const resolveDefective = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { resolution, resolvedQuantity, resolutionNote } = req.body;

        if (!resolution || !resolvedQuantity) {
            return next(new AppError("Vui lòng cung cấp quyết định xử lý và số lượng", 400));
        }

        const validResolutions = ["repaired", "destroyed", "returned_to_supplier"];
        if (!validResolutions.includes(resolution)) {
            return next(new AppError("Quyết định xử lý không hợp lệ", 400));
        }

        if (Number(resolvedQuantity) <= 0) {
            return next(new AppError("Số lượng xử lý phải lớn hơn 0", 400));
        }

        const userId = (req as any).user?.id;
        if (!userId) {
            return next(new AppError("User ID không tồn tại", 401));
        }

        const result = await InventoryService.resolveDefective(
            req.params.id,
            {
                resolution,
                resolvedQuantity: Number(resolvedQuantity),
                resolutionNote,
            },
            userId
        );

        ResponseHandler.success(
            res,
            {
                inventory: transformMongoDocument(result.inventory),
                report: transformMongoDocument(result.report),
                history: transformMongoDocument(result.history),
            },
            "Xử lý báo cáo hàng lỗi thành công"
        );
    }
);

// ═════════════════════════════════════════════════════════════════════
// RETURN PRODUCT (NEW)
// ═════════════════════════════════════════════════════════════════════

// @desc    Record a product return
// @route   POST /api/v1/inventory/:id/return
// @access  Private (Admin, Employee)
export const returnProduct = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { quantity, reason } = req.body;

        if (!quantity || !reason) {
            return next(new AppError("Vui lòng cung cấp số lượng và lý do trả hàng", 400));
        }

        if (Number(quantity) <= 0) {
            return next(new AppError("Số lượng phải lớn hơn 0", 400));
        }

        const userId = (req as any).user?.id;
        if (!userId) {
            return next(new AppError("User ID không tồn tại", 401));
        }

        const result = await InventoryService.returnProduct(
            {
                inventoryId: req.params.id,
                quantity: Number(quantity),
                reason,
            },
            userId
        );

        ResponseHandler.success(
            res,
            {
                inventory: transformMongoDocument(result.inventory),
                history: transformMongoDocument(result.history),
            },
            "Ghi nhận trả hàng thành công",
            201
        );
    }
);

// ═════════════════════════════════════════════════════════════════════
// STATUS CHANGE (NEW)
// ═════════════════════════════════════════════════════════════════════

// @desc    Change product status in inventory
// @route   POST /api/v1/inventory/:id/status-change
// @access  Private (Admin, Employee)
export const changeStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { quantity, fromStatus, toStatus, reason } = req.body;

        if (!quantity || !fromStatus || !toStatus) {
            return next(
                new AppError("Vui lòng cung cấp số lượng, trạng thái nguồn và đích", 400)
            );
        }

        if (Number(quantity) <= 0) {
            return next(new AppError("Số lượng phải lớn hơn 0", 400));
        }

        const userId = (req as any).user?.id;
        if (!userId) {
            return next(new AppError("User ID không tồn tại", 401));
        }

        const result = await InventoryService.changeStatus(
            {
                inventoryId: req.params.id,
                quantity: Number(quantity),
                fromStatus,
                toStatus,
                reason,
            },
            userId
        );

        ResponseHandler.success(
            res,
            {
                inventory: transformMongoDocument(result.inventory),
                history: transformMongoDocument(result.history),
            },
            "Chuyển trạng thái thành công"
        );
    }
);
