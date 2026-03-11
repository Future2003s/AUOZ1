import { Types } from "mongoose";
import mongoose from "mongoose";
import { Inventory, IInventory } from "../models/Inventory";
import { InventoryHistory, IInventoryHistory } from "../models/InventoryHistory";
import { DefectiveReport, IDefectiveReport } from "../models/DefectiveReport";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { CacheWrapper, QueryAnalyzer } from "../utils/performance";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/redis";
import { paginateQuery, optimizedPagination } from "../utils/pagination";

// ─── Interfaces ──────────────────────────────────────────────────────

interface CreateInventoryData {
    sku: string;
    name: string;
    quantity: number;
    unit: string;
    netWeight: number;
    minStock: number;
    price: number;
    location: string;
    category: string;
    productId?: string;
}

interface UpdateInventoryData extends Partial<CreateInventoryData> { }

interface InventoryFilters {
    search?: string;
    location?: string;
    category?: string;
    lowStock?: boolean;
    premium?: boolean;
}

interface InventoryQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: "asc" | "desc";
}

interface StockAdjustmentData {
    inventoryId: string;
    type: "import" | "export";
    amount: number;
    partner?: string;
    reason?: string;
}

interface DefectiveReportData {
    inventoryId: string;
    quantity: number;
    reason: string;
    images?: string[];
    severity?: "low" | "medium" | "high" | "critical";
}

interface ResolveDefectiveData {
    resolution: "repaired" | "destroyed" | "returned_to_supplier";
    resolvedQuantity: number;
    resolutionNote?: string;
}

interface StatusChangeData {
    inventoryId: string;
    quantity: number;
    fromStatus: "normal" | "defective" | "returned" | "damaged" | "pending_check";
    toStatus: "normal" | "defective" | "returned" | "damaged" | "pending_check";
    reason?: string;
}

interface ReturnProductData {
    inventoryId: string;
    quantity: number;
    reason: string;
}

// ─── Valid status transitions ────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
    normal: ["pending_check"],
    pending_check: ["defective", "normal"],
    defective: ["normal", "damaged", "returned"],
    returned: ["normal"],
    damaged: [], // terminal state
};

// Map status name to inventory field
const STATUS_FIELD_MAP: Record<string, keyof IInventory> = {
    normal: "quantity",
    defective: "defectiveQty",
    returned: "returnedQty",
    damaged: "damagedQty",
    pending_check: "pendingCheckQty",
};

// ─── Service ─────────────────────────────────────────────────────────

export class InventoryService {
    private static cache = new CacheWrapper("inventory", CACHE_TTL.MEDIUM);
    private static historyCache = new CacheWrapper("inventory_history", CACHE_TTL.SHORT);

    // ═════════════════════════════════════════════════════════════════
    // CRUD (existing, kept as-is)
    // ═════════════════════════════════════════════════════════════════

    static async getInventories(
        filters: InventoryFilters = {},
        query: InventoryQuery = {},
        userId?: string
    ) {
        return QueryAnalyzer.analyzeQuery("InventoryService.getInventories", async () => {
            const page = query.page || 1;
            const limit = query.limit || 100;
            const sort = query.sort || "lastUpdated";
            const order = query.order || "desc";

            const filterQuery: any = {};

            if (filters.search) {
                filterQuery.name = { $regex: filters.search, $options: "i" };
            }
            if (filters.location) {
                filterQuery.location = filters.location;
            }
            if (filters.category) {
                filterQuery.category = filters.category;
            }
            if (filters.lowStock) {
                filterQuery.$expr = { $lt: ["$quantity", "$minStock"] };
            }
            if (filters.premium) {
                filterQuery.category = { $in: ["Cao cấp", "Premium"] };
            }

            const sortOptions: any = {};
            sortOptions[sort] = order === "asc" ? 1 : -1;

            const mongoQuery = Inventory.find(filterQuery);

            const result = await paginateQuery(mongoQuery, {
                page,
                limit,
                sort,
                order,
            });

            await this.cache.del("inventory_list");

            return {
                inventories: result.data,
                pagination: result.pagination,
            };
        });
    }

    static async getInventoryById(id: string): Promise<IInventory> {
        return QueryAnalyzer.analyzeQuery(`InventoryService.getInventoryById:${id}`, async () => {
            const cacheKey = `inventory:${id}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                logger.debug(`Inventory cache hit: ${id}`);
                return cached as IInventory;
            }

            if (!Types.ObjectId.isValid(id)) {
                throw new AppError("Invalid inventory ID", 400);
            }

            const inventory = await Inventory.findById(id).lean();
            if (!inventory) {
                throw new AppError("Inventory not found", 404);
            }

            await this.cache.set(cacheKey, inventory, CACHE_TTL.MEDIUM);
            return inventory as IInventory;
        });
    }

    static async createInventory(
        inventoryData: CreateInventoryData,
        userId?: string
    ): Promise<IInventory> {
        return QueryAnalyzer.analyzeQuery("InventoryService.createInventory", async () => {
            const inventory = await Inventory.create({
                ...inventoryData,
                productId: inventoryData.productId
                    ? new Types.ObjectId(inventoryData.productId)
                    : undefined,
                lastUpdated: new Date(),
                createdBy: userId ? new Types.ObjectId(userId) : undefined,
            });

            await this.invalidateCache((inventory as any)._id.toString());
            logger.info(`Inventory created: ${inventory._id}`);

            return inventory;
        });
    }

    static async updateInventory(
        id: string,
        inventoryData: UpdateInventoryData,
        userId?: string
    ): Promise<IInventory> {
        return QueryAnalyzer.analyzeQuery(`InventoryService.updateInventory:${id}`, async () => {
            if (!Types.ObjectId.isValid(id)) {
                throw new AppError("Invalid inventory ID", 400);
            }

            const inventory = await Inventory.findByIdAndUpdate(
                id,
                {
                    ...inventoryData,
                    lastUpdated: new Date(),
                    updatedBy: userId ? new Types.ObjectId(userId) : undefined,
                },
                { new: true, runValidators: true }
            );

            if (!inventory) {
                throw new AppError("Inventory not found", 404);
            }

            await this.invalidateCache(id);
            logger.info(`Inventory updated: ${id}`);

            return inventory;
        });
    }

    static async deleteInventory(id: string): Promise<void> {
        return QueryAnalyzer.analyzeQuery(`InventoryService.deleteInventory:${id}`, async () => {
            if (!Types.ObjectId.isValid(id)) {
                throw new AppError("Invalid inventory ID", 400);
            }

            const inventory = await Inventory.findByIdAndDelete(id);
            if (!inventory) {
                throw new AppError("Inventory not found", 404);
            }

            await InventoryHistory.deleteMany({ inventoryId: new Types.ObjectId(id) });
            await DefectiveReport.deleteMany({ inventoryId: new Types.ObjectId(id) });

            await this.invalidateCache(id);
            logger.info(`Inventory deleted: ${id}`);
        });
    }

    // ═════════════════════════════════════════════════════════════════
    // STOCK ADJUSTMENT (extended with balance snapshot)
    // ═════════════════════════════════════════════════════════════════

    static async adjustStock(
        adjustmentData: StockAdjustmentData,
        userId?: string
    ): Promise<{ inventory: IInventory; history: IInventoryHistory }> {
        return QueryAnalyzer.analyzeQuery(
            `InventoryService.adjustStock:${adjustmentData.inventoryId}`,
            async () => {
                if (!Types.ObjectId.isValid(adjustmentData.inventoryId)) {
                    throw new AppError("Invalid inventory ID", 400);
                }

                const inventory = await Inventory.findById(adjustmentData.inventoryId);
                if (!inventory) {
                    throw new AppError("Inventory not found", 404);
                }

                const balanceBefore = inventory.quantity;

                const newQuantity =
                    adjustmentData.type === "import"
                        ? inventory.quantity + adjustmentData.amount
                        : inventory.quantity - adjustmentData.amount;

                if (newQuantity < 0) {
                    throw new AppError("Số lượng tồn kho không đủ để xuất", 400);
                }

                inventory.quantity = newQuantity;
                inventory.lastUpdated = new Date();
                inventory.updatedBy = userId ? new Types.ObjectId(userId) : undefined;

                // Track sold quantity for exports and imported quantity for imports
                if (adjustmentData.type === "export") {
                    inventory.soldQty = (inventory.soldQty || 0) + adjustmentData.amount;
                } else if (adjustmentData.type === "import") {
                    inventory.importedQty = (inventory.importedQty || 0) + adjustmentData.amount;
                }

                await inventory.save();

                const history = await InventoryHistory.create({
                    inventoryId: inventory._id,
                    itemName: inventory.name,
                    type: adjustmentData.type,
                    amount: adjustmentData.amount,
                    unit: inventory.unit,
                    partner: adjustmentData.partner,
                    reason: adjustmentData.reason,
                    balanceBefore,
                    balanceAfter: newQuantity,
                    createdBy: userId ? new Types.ObjectId(userId) : undefined,
                });

                await this.invalidateCache(adjustmentData.inventoryId);

                logger.info(
                    `Stock adjusted: ${adjustmentData.inventoryId}, type: ${adjustmentData.type}, amount: ${adjustmentData.amount}`
                );

                return { inventory, history };
            }
        );
    }

    // ═════════════════════════════════════════════════════════════════
    // DEFECTIVE REPORTING (NEW)
    // ═════════════════════════════════════════════════════════════════

    /**
     * Report defective products: move qty from normal → pending_check
     */
    static async reportDefective(
        data: DefectiveReportData,
        userId: string
    ): Promise<{ inventory: IInventory; report: IDefectiveReport; history: IInventoryHistory }> {
        if (!Types.ObjectId.isValid(data.inventoryId)) {
            throw new AppError("Invalid inventory ID", 400);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const inventory = await Inventory.findById(data.inventoryId).session(session);
            if (!inventory) {
                throw new AppError("Inventory not found", 404);
            }

            if (data.quantity > inventory.quantity) {
                throw new AppError(
                    `Số lượng báo lỗi (${data.quantity}) vượt quá tồn kho hàng tốt (${inventory.quantity})`,
                    400
                );
            }

            const balanceBefore = inventory.quantity;

            // Move from normal → pending_check
            inventory.quantity -= data.quantity;
            inventory.pendingCheckQty = (inventory.pendingCheckQty || 0) + data.quantity;
            inventory.lastUpdated = new Date();
            inventory.updatedBy = new Types.ObjectId(userId);
            await inventory.save({ session });

            // Create defective report
            const [report] = await DefectiveReport.create(
                [
                    {
                        inventoryId: inventory._id,
                        productId: inventory.productId,
                        quantity: data.quantity,
                        reason: data.reason,
                        images: data.images || [],
                        severity: data.severity || "medium",
                        status: "pending",
                        reportedBy: new Types.ObjectId(userId),
                    },
                ],
                { session }
            );

            // Create history
            const [history] = await InventoryHistory.create(
                [
                    {
                        inventoryId: inventory._id,
                        itemName: inventory.name,
                        type: "defective",
                        amount: data.quantity,
                        unit: inventory.unit,
                        reason: data.reason,
                        images: data.images,
                        fromStatus: "normal",
                        toStatus: "pending_check",
                        balanceBefore,
                        balanceAfter: inventory.quantity,
                        createdBy: new Types.ObjectId(userId),
                    },
                ],
                { session }
            );

            await session.commitTransaction();

            await this.invalidateCache(data.inventoryId);

            logger.info(
                `Defective reported: inventory=${data.inventoryId}, qty=${data.quantity}, report=${report._id}`
            );

            return { inventory, report, history };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Resolve a defective report: repair, destroy, or return to supplier
     */
    static async resolveDefective(
        reportId: string,
        data: ResolveDefectiveData,
        userId: string
    ): Promise<{ inventory: IInventory; report: IDefectiveReport; history: IInventoryHistory }> {
        if (!Types.ObjectId.isValid(reportId)) {
            throw new AppError("Invalid report ID", 400);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const report = await DefectiveReport.findById(reportId).session(session);
            if (!report) {
                throw new AppError("Defective report not found", 404);
            }

            if (report.status === "resolved" || report.status === "destroyed") {
                throw new AppError("Báo cáo này đã được xử lý", 400);
            }

            if (data.resolvedQuantity > report.quantity) {
                throw new AppError(
                    `Số lượng xử lý (${data.resolvedQuantity}) vượt quá số lượng báo cáo (${report.quantity})`,
                    400
                );
            }

            const inventory = await Inventory.findById(report.inventoryId).session(session);
            if (!inventory) {
                throw new AppError("Inventory not found", 404);
            }

            // Determine source: pending_check or defective
            const sourceField = inventory.pendingCheckQty >= data.resolvedQuantity
                ? "pendingCheckQty"
                : "defectiveQty";

            if ((inventory[sourceField] as number) < data.resolvedQuantity) {
                throw new AppError("Không đủ số lượng trong trạng thái hiện tại", 400);
            }

            const balanceBefore = inventory.quantity;
            let toStatus: string;
            let historyType: string;

            switch (data.resolution) {
                case "repaired":
                    // Back to normal
                    (inventory[sourceField] as number) -= data.resolvedQuantity;
                    inventory.quantity += data.resolvedQuantity;
                    toStatus = "normal";
                    historyType = "status_change";
                    break;

                case "destroyed":
                    // Move to damaged
                    (inventory[sourceField] as number) -= data.resolvedQuantity;
                    inventory.damagedQty = (inventory.damagedQty || 0) + data.resolvedQuantity;
                    toStatus = "damaged";
                    historyType = "destroy";
                    break;

                case "returned_to_supplier":
                    // Move to returned
                    (inventory[sourceField] as number) -= data.resolvedQuantity;
                    inventory.returnedQty = (inventory.returnedQty || 0) + data.resolvedQuantity;
                    toStatus = "returned";
                    historyType = "status_change";
                    break;

                default:
                    throw new AppError("Resolution không hợp lệ", 400);
            }

            inventory.lastUpdated = new Date();
            inventory.updatedBy = new Types.ObjectId(userId);
            await inventory.save({ session });

            // Update report
            report.status = data.resolution === "destroyed" ? "destroyed" : "resolved";
            report.resolution = data.resolution;
            report.resolutionNote = data.resolutionNote;
            report.resolvedQuantity = data.resolvedQuantity;
            report.resolvedBy = new Types.ObjectId(userId);
            report.resolvedAt = new Date();
            await report.save({ session });

            // Create history
            const fromStatus = sourceField === "pendingCheckQty" ? "pending_check" : "defective";
            const [history] = await InventoryHistory.create(
                [
                    {
                        inventoryId: inventory._id,
                        itemName: inventory.name,
                        type: historyType,
                        amount: data.resolvedQuantity,
                        unit: inventory.unit,
                        reason: data.resolutionNote || `Resolved: ${data.resolution}`,
                        fromStatus,
                        toStatus,
                        balanceBefore,
                        balanceAfter: inventory.quantity,
                        createdBy: new Types.ObjectId(userId),
                    },
                ],
                { session }
            );

            await session.commitTransaction();

            await this.invalidateCache(report.inventoryId.toString());

            logger.info(
                `Defective resolved: report=${reportId}, resolution=${data.resolution}, qty=${data.resolvedQuantity}`
            );

            return { inventory, report, history };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // RETURN PRODUCT (NEW)
    // ═════════════════════════════════════════════════════════════════

    /**
     * Record a product return (customer return)
     */
    static async returnProduct(
        data: ReturnProductData,
        userId: string
    ): Promise<{ inventory: IInventory; history: IInventoryHistory }> {
        if (!Types.ObjectId.isValid(data.inventoryId)) {
            throw new AppError("Invalid inventory ID", 400);
        }

        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) {
            throw new AppError("Inventory not found", 404);
        }

        const balanceBefore = inventory.quantity;

        // Add to returned, reduce sold count
        inventory.returnedQty = (inventory.returnedQty || 0) + data.quantity;
        if (inventory.soldQty >= data.quantity) {
            inventory.soldQty -= data.quantity;
        }
        inventory.lastUpdated = new Date();
        inventory.updatedBy = new Types.ObjectId(userId);
        await inventory.save();

        const history = await InventoryHistory.create({
            inventoryId: inventory._id,
            itemName: inventory.name,
            type: "return",
            amount: data.quantity,
            unit: inventory.unit,
            reason: data.reason,
            fromStatus: "sold",
            toStatus: "returned",
            balanceBefore,
            balanceAfter: inventory.quantity,
            createdBy: new Types.ObjectId(userId),
        });

        await this.invalidateCache(data.inventoryId);

        logger.info(`Product returned: inventory=${data.inventoryId}, qty=${data.quantity}`);

        return { inventory, history };
    }

    // ═════════════════════════════════════════════════════════════════
    // GENERIC STATUS CHANGE (NEW)
    // ═════════════════════════════════════════════════════════════════

    /**
     * Change status of inventory items (with validation)
     */
    static async changeStatus(
        data: StatusChangeData,
        userId: string
    ): Promise<{ inventory: IInventory; history: IInventoryHistory }> {
        if (!Types.ObjectId.isValid(data.inventoryId)) {
            throw new AppError("Invalid inventory ID", 400);
        }

        // Validate transition
        const allowedTargets = VALID_TRANSITIONS[data.fromStatus];
        if (!allowedTargets || !allowedTargets.includes(data.toStatus)) {
            throw new AppError(
                `Không thể chuyển từ "${data.fromStatus}" sang "${data.toStatus}"`,
                400
            );
        }

        const inventory = await Inventory.findById(data.inventoryId);
        if (!inventory) {
            throw new AppError("Inventory not found", 404);
        }

        const fromField = STATUS_FIELD_MAP[data.fromStatus];
        const toField = STATUS_FIELD_MAP[data.toStatus];

        if (!fromField || !toField) {
            throw new AppError("Trạng thái không hợp lệ", 400);
        }

        const currentFromQty = (inventory[fromField] as number) || 0;
        if (currentFromQty < data.quantity) {
            throw new AppError(
                `Không đủ số lượng (hiện có: ${currentFromQty}, cần: ${data.quantity})`,
                400
            );
        }

        const balanceBefore = inventory.quantity;

        // Move quantity between statuses
        (inventory[fromField] as number) = currentFromQty - data.quantity;
        (inventory[toField] as number) = ((inventory[toField] as number) || 0) + data.quantity;
        inventory.lastUpdated = new Date();
        inventory.updatedBy = new Types.ObjectId(userId);
        await inventory.save();

        const history = await InventoryHistory.create({
            inventoryId: inventory._id,
            itemName: inventory.name,
            type: "status_change",
            amount: data.quantity,
            unit: inventory.unit,
            reason: data.reason,
            fromStatus: data.fromStatus,
            toStatus: data.toStatus,
            balanceBefore,
            balanceAfter: inventory.quantity,
            createdBy: new Types.ObjectId(userId),
        });

        await this.invalidateCache(data.inventoryId);

        logger.info(
            `Status changed: ${data.inventoryId}, ${data.fromStatus} → ${data.toStatus}, qty=${data.quantity}`
        );

        return { inventory, history };
    }

    // ═════════════════════════════════════════════════════════════════
    // DEFECTIVE REPORTS QUERY (NEW)
    // ═════════════════════════════════════════════════════════════════

    static async getDefectiveReports(
        filters: {
            inventoryId?: string;
            status?: string;
            severity?: string;
            search?: string;
            dateFrom?: string;
            dateTo?: string;
        } = {},
        query: InventoryQuery = {}
    ) {
        return QueryAnalyzer.analyzeQuery("InventoryService.getDefectiveReports", async () => {
            const page = query.page || 1;
            const limit = query.limit || 50;
            const sort = query.sort || "createdAt";
            const order = query.order || "desc";

            const filterQuery: any = {};

            if (filters.inventoryId) {
                if (!Types.ObjectId.isValid(filters.inventoryId)) {
                    throw new AppError("Invalid inventory ID", 400);
                }
                filterQuery.inventoryId = new Types.ObjectId(filters.inventoryId);
            }

            if (filters.status) {
                filterQuery.status = filters.status;
            }

            if (filters.severity) {
                filterQuery.severity = filters.severity;
            }

            if (filters.search) {
                filterQuery.reason = { $regex: filters.search, $options: "i" };
            }

            if (filters.dateFrom || filters.dateTo) {
                filterQuery.createdAt = {};
                if (filters.dateFrom) {
                    filterQuery.createdAt.$gte = new Date(filters.dateFrom);
                }
                if (filters.dateTo) {
                    filterQuery.createdAt.$lte = new Date(filters.dateTo);
                }
            }

            const sortOptions: any = {};
            sortOptions[sort] = order === "asc" ? 1 : -1;

            const mongoQuery = DefectiveReport.find(filterQuery)
                .populate("inventoryId", "name location")
                .populate("reportedBy", "firstName lastName email")
                .populate("resolvedBy", "firstName lastName email")
                .sort(sortOptions);

            const result = await paginateQuery(mongoQuery, { page, limit, sort, order });

            return {
                reports: result.data,
                pagination: result.pagination,
            };
        });
    }

    // ═════════════════════════════════════════════════════════════════
    // ENHANCED STATS (NEW)
    // ═════════════════════════════════════════════════════════════════

    static async getEnhancedStats() {
        return QueryAnalyzer.analyzeQuery("InventoryService.getEnhancedStats", async () => {
            const inventories = await Inventory.find({}).lean();

            const totalNormal = inventories.reduce((s, i) => s + (i.quantity || 0), 0);
            const totalDefective = inventories.reduce((s, i) => s + (i.defectiveQty || 0), 0);
            const totalPendingCheck = inventories.reduce(
                (s, i) => s + (i.pendingCheckQty || 0),
                0
            );
            const totalReturned = inventories.reduce((s, i) => s + (i.returnedQty || 0), 0);
            const totalDamaged = inventories.reduce((s, i) => s + (i.damagedQty || 0), 0);
            const totalSold = inventories.reduce((s, i) => s + (i.soldQty || 0), 0);
            const totalValue = inventories.reduce(
                (s, i) => s + (i.quantity || 0) * (i.price || 0),
                0
            );
            const totalWeightKg = inventories.reduce(
                (s, i) => s + ((i.quantity || 0) * (i.netWeight || 0)) / 1000,
                0
            );
            const lowStock = inventories.filter((i) => i.quantity < i.minStock).length;

            // Defective reports stats
            const pendingReports = await DefectiveReport.countDocuments({ status: "pending" });
            const inspectingReports = await DefectiveReport.countDocuments({
                status: "inspecting",
            });

            // Per-location breakdown
            const byLocation = inventories.reduce(
                (acc, inv) => {
                    const loc = inv.location || "Unknown";
                    if (!acc[loc]) {
                        acc[loc] = { normal: 0, defective: 0, damaged: 0, returned: 0, total: 0 };
                    }
                    acc[loc].normal += inv.quantity || 0;
                    acc[loc].defective += (inv.defectiveQty || 0) + (inv.pendingCheckQty || 0);
                    acc[loc].damaged += inv.damagedQty || 0;
                    acc[loc].returned += inv.returnedQty || 0;
                    acc[loc].total +=
                        (inv.quantity || 0) +
                        (inv.defectiveQty || 0) +
                        (inv.pendingCheckQty || 0) +
                        (inv.returnedQty || 0) +
                        (inv.damagedQty || 0);
                    return acc;
                },
                {} as Record<string, any>
            );

            return {
                totalNormal,
                totalDefective: totalDefective + totalPendingCheck,
                totalPendingCheck,
                totalReturned,
                totalDamaged,
                totalSold,
                totalValue,
                totalWeightKg: Number(totalWeightKg.toFixed(1)),
                lowStock,
                pendingReports,
                inspectingReports,
                byLocation,
                // Backward compat
                totalJars: totalNormal,
            };
        });
    }

    // Keep legacy getInventoryStats for backward compat
    static async getInventoryStats() {
        return this.getEnhancedStats();
    }

    // ═════════════════════════════════════════════════════════════════
    // HISTORY (existing, kept as-is with minor enhancements)
    // ═════════════════════════════════════════════════════════════════

    static async getInventoryHistory(
        filters: {
            inventoryId?: string;
            type?: string;
            search?: string;
            dateFrom?: string;
            dateTo?: string;
        } = {},
        query: InventoryQuery = {}
    ) {
        return QueryAnalyzer.analyzeQuery("InventoryService.getInventoryHistory", async () => {
            const page = query.page || 1;
            const limit = query.limit || 100;
            const sort = query.sort || "createdAt";
            const order = query.order || "desc";

            const filterQuery: any = {};

            if (filters.inventoryId) {
                if (!Types.ObjectId.isValid(filters.inventoryId)) {
                    throw new AppError("Invalid inventory ID", 400);
                }
                filterQuery.inventoryId = new Types.ObjectId(filters.inventoryId);
            }

            if (filters.type) {
                filterQuery.type = filters.type;
            }

            if (filters.search) {
                filterQuery.$or = [
                    { itemName: { $regex: filters.search, $options: "i" } },
                    { partner: { $regex: filters.search, $options: "i" } },
                    { reason: { $regex: filters.search, $options: "i" } },
                ];
            }

            if (filters.dateFrom || filters.dateTo) {
                filterQuery.createdAt = {};
                if (filters.dateFrom) {
                    filterQuery.createdAt.$gte = new Date(filters.dateFrom);
                }
                if (filters.dateTo) {
                    filterQuery.createdAt.$lte = new Date(filters.dateTo);
                }
            }

            const sortOptions: any = {};
            sortOptions[sort] = order === "asc" ? 1 : -1;

            const mongoQuery = InventoryHistory.find(filterQuery)
                .populate("createdBy", "firstName lastName email")
                .sort(sortOptions);

            const result = await paginateQuery(mongoQuery, { page, limit, sort, order });

            return {
                history: result.data,
                pagination: result.pagination,
            };
        });
    }

    // ═════════════════════════════════════════════════════════════════
    // HELPERS (PRIVATE)
    // ═════════════════════════════════════════════════════════════════

    private static async invalidateCache(inventoryId: string) {
        await this.cache.del("inventory_list");
        await this.cache.del(`inventory:${inventoryId}`);
        await this.historyCache.del("inventory_history_list");
        await optimizedPagination.clearCache();
    }
}
