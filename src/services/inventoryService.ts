import { Types } from "mongoose";
import { Inventory, IInventory } from "../models/Inventory";
import { InventoryHistory, IInventoryHistory } from "../models/InventoryHistory";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { CacheWrapper, QueryAnalyzer } from "../utils/performance";
import { CACHE_PREFIXES, CACHE_TTL } from "../config/redis";
import { paginateQuery, optimizedPagination } from "../utils/pagination";

interface CreateInventoryData {
    name: string;
    quantity: number;
    unit: string;
    netWeight: number;
    minStock: number;
    price: number;
    location: string;
    category: string;
}

interface UpdateInventoryData extends Partial<CreateInventoryData> {}

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
}

export class InventoryService {
    private static cache = new CacheWrapper("inventory", CACHE_TTL.MEDIUM);
    private static historyCache = new CacheWrapper("inventory_history", CACHE_TTL.SHORT);

    /**
     * Get all inventory items with filters and pagination
     */
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

            // Build filter query
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

            // Build sort
            const sortOptions: any = {};
            sortOptions[sort] = order === "asc" ? 1 : -1;

            // Build query
            const mongoQuery = Inventory.find(filterQuery).sort(sortOptions);

            // Execute query with pagination
            const result = await paginateQuery(mongoQuery, {
                page,
                limit,
                sort,
                order
            });

            // Invalidate cache
            await this.cache.del("inventory_list");

            return {
                inventories: result.data,
                pagination: result.pagination,
            };
        });
    }

    /**
     * Get single inventory item by ID
     */
    static async getInventoryById(id: string): Promise<IInventory> {
        return QueryAnalyzer.analyzeQuery(`InventoryService.getInventoryById:${id}`, async () => {
            // Try cache first
            const cacheKey = `inventory:${id}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                logger.debug(`Inventory cache hit: ${id}`);
                return cached as IInventory;
            }

            // Validate ObjectId
            if (!Types.ObjectId.isValid(id)) {
                throw new AppError("Invalid inventory ID", 400);
            }

            const inventory = await Inventory.findById(id).lean();

            if (!inventory) {
                throw new AppError("Inventory not found", 404);
            }

            // Cache the result
            await this.cache.set(cacheKey, inventory, CACHE_TTL.MEDIUM);

            return inventory as IInventory;
        });
    }

    /**
     * Create new inventory item
     */
    static async createInventory(
        inventoryData: CreateInventoryData,
        userId?: string
    ): Promise<IInventory> {
        return QueryAnalyzer.analyzeQuery("InventoryService.createInventory", async () => {
            const inventory = await Inventory.create({
                ...inventoryData,
                lastUpdated: new Date(),
                createdBy: userId ? new Types.ObjectId(userId) : undefined,
            });

            // Invalidate cache
            await this.cache.del("inventory_list");
            await this.cache.del(`inventory:${inventory._id}`);

            logger.info(`Inventory created: ${inventory._id}`);

            return inventory;
        });
    }

    /**
     * Update inventory item
     */
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

            // Invalidate cache
            await this.cache.del("inventory_list");
            await this.cache.del(`inventory:${id}`);

            logger.info(`Inventory updated: ${id}`);

            return inventory;
        });
    }

    /**
     * Delete inventory item
     */
    static async deleteInventory(id: string): Promise<void> {
        return QueryAnalyzer.analyzeQuery(`InventoryService.deleteInventory:${id}`, async () => {
            if (!Types.ObjectId.isValid(id)) {
                throw new AppError("Invalid inventory ID", 400);
            }

            const inventory = await Inventory.findByIdAndDelete(id);

            if (!inventory) {
                throw new AppError("Inventory not found", 404);
            }

            // Delete related history
            await InventoryHistory.deleteMany({ inventoryId: new Types.ObjectId(id) });

            // Invalidate cache
            await this.cache.del("inventory_list");
            await this.cache.del(`inventory:${id}`);

            logger.info(`Inventory deleted: ${id}`);
        });
    }

    /**
     * Adjust stock (import/export)
     */
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

                // Calculate new quantity
                const newQuantity =
                    adjustmentData.type === "import"
                        ? inventory.quantity + adjustmentData.amount
                        : inventory.quantity - adjustmentData.amount;

                if (newQuantity < 0) {
                    throw new AppError("Số lượng tồn kho không đủ để xuất", 400);
                }

                // Update inventory
                inventory.quantity = newQuantity;
                inventory.lastUpdated = new Date();
                inventory.updatedBy = userId ? new Types.ObjectId(userId) : undefined;
                await inventory.save();

                // Create history record
                const history = await InventoryHistory.create({
                    inventoryId: inventory._id,
                    itemName: inventory.name,
                    type: adjustmentData.type,
                    amount: adjustmentData.amount,
                    unit: inventory.unit,
                    partner: adjustmentData.partner,
                    createdBy: userId ? new Types.ObjectId(userId) : undefined,
                });

                // Invalidate cache
                await this.cache.del("inventory_list");
                await this.cache.del(`inventory:${adjustmentData.inventoryId}`);
                await this.historyCache.del("inventory_history_list");

                logger.info(
                    `Stock adjusted: ${adjustmentData.inventoryId}, type: ${adjustmentData.type}, amount: ${adjustmentData.amount}`
                );

                return { inventory, history };
            }
        );
    }

    /**
     * Get inventory statistics
     */
    static async getInventoryStats() {
        return QueryAnalyzer.analyzeQuery("InventoryService.getInventoryStats", async () => {
            const inventories = await Inventory.find({}).lean();

            const totalJars = inventories.reduce(
                (sum, item) => sum + Number(item.quantity || 0),
                0
            );

            const totalValue = inventories.reduce(
                (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
                0
            );

            const totalWeightKg = inventories.reduce(
                (sum, item) =>
                    sum + (Number(item.quantity || 0) * Number(item.netWeight || 0)) / 1000,
                0
            );

            const lowStock = inventories.filter(
                (item) => item.quantity < item.minStock
            ).length;

            return {
                totalJars,
                totalValue,
                totalWeightKg: totalWeightKg.toFixed(1),
                lowStock,
            };
        });
    }

    /**
     * Get inventory history
     */
    static async getInventoryHistory(
        filters: { inventoryId?: string; type?: string; search?: string } = {},
        query: InventoryQuery = {}
    ) {
        return QueryAnalyzer.analyzeQuery("InventoryService.getInventoryHistory", async () => {
            const page = query.page || 1;
            const limit = query.limit || 100;
            const sort = query.sort || "createdAt";
            const order = query.order || "desc";

            // Build filter query
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
                ];
            }

            // Build sort
            const sortOptions: any = {};
            sortOptions[sort] = order === "asc" ? 1 : -1;

            // Build query
            const mongoQuery = InventoryHistory.find(filterQuery).sort(sortOptions);

            // Execute query with pagination
            const result = await paginateQuery(mongoQuery, {
                page,
                limit,
                sort,
                order
            });

            return {
                history: result.data,
                pagination: result.pagination,
            };
        });
    }
}
