"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const mongoose_1 = require("mongoose");
const Inventory_1 = require("../models/Inventory");
const InventoryHistory_1 = require("../models/InventoryHistory");
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
const performance_1 = require("../utils/performance");
const redis_1 = require("../config/redis");
const pagination_1 = require("../utils/pagination");
class InventoryService {
    static cache = new performance_1.CacheWrapper("inventory", redis_1.CACHE_TTL.MEDIUM);
    static historyCache = new performance_1.CacheWrapper("inventory_history", redis_1.CACHE_TTL.SHORT);
    /**
     * Get all inventory items with filters and pagination
     */
    static async getInventories(filters = {}, query = {}, userId) {
        return performance_1.QueryAnalyzer.analyzeQuery("InventoryService.getInventories", async () => {
            const page = query.page || 1;
            const limit = query.limit || 100;
            const sort = query.sort || "lastUpdated";
            const order = query.order || "desc";
            // Build filter query
            const filterQuery = {};
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
            const sortOptions = {};
            sortOptions[sort] = order === "asc" ? 1 : -1;
            // Build query
            const query = Inventory_1.Inventory.find(filterQuery).sort(sortOptions);
            // Execute query with pagination
            const result = await (0, pagination_1.paginateQuery)(query, {
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
    static async getInventoryById(id) {
        return performance_1.QueryAnalyzer.analyzeQuery(`InventoryService.getInventoryById:${id}`, async () => {
            // Try cache first
            const cacheKey = `inventory:${id}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug(`Inventory cache hit: ${id}`);
                return cached;
            }
            // Validate ObjectId
            if (!mongoose_1.Types.ObjectId.isValid(id)) {
                throw new AppError_1.AppError("Invalid inventory ID", 400);
            }
            const inventory = await Inventory_1.Inventory.findById(id).lean();
            if (!inventory) {
                throw new AppError_1.AppError("Inventory not found", 404);
            }
            // Cache the result
            await this.cache.set(cacheKey, inventory, redis_1.CACHE_TTL.MEDIUM);
            return inventory;
        });
    }
    /**
     * Create new inventory item
     */
    static async createInventory(inventoryData, userId) {
        return performance_1.QueryAnalyzer.analyzeQuery("InventoryService.createInventory", async () => {
            const inventory = await Inventory_1.Inventory.create({
                ...inventoryData,
                lastUpdated: new Date(),
                createdBy: userId ? new mongoose_1.Types.ObjectId(userId) : undefined,
            });
            // Invalidate cache
            await this.cache.del("inventory_list");
            await this.cache.del(`inventory:${inventory._id}`);
            logger_1.logger.info(`Inventory created: ${inventory._id}`);
            return inventory;
        });
    }
    /**
     * Update inventory item
     */
    static async updateInventory(id, inventoryData, userId) {
        return performance_1.QueryAnalyzer.analyzeQuery(`InventoryService.updateInventory:${id}`, async () => {
            if (!mongoose_1.Types.ObjectId.isValid(id)) {
                throw new AppError_1.AppError("Invalid inventory ID", 400);
            }
            const inventory = await Inventory_1.Inventory.findByIdAndUpdate(id, {
                ...inventoryData,
                lastUpdated: new Date(),
                updatedBy: userId ? new mongoose_1.Types.ObjectId(userId) : undefined,
            }, { new: true, runValidators: true });
            if (!inventory) {
                throw new AppError_1.AppError("Inventory not found", 404);
            }
            // Invalidate cache
            await this.cache.del("inventory_list");
            await this.cache.del(`inventory:${id}`);
            logger_1.logger.info(`Inventory updated: ${id}`);
            return inventory;
        });
    }
    /**
     * Delete inventory item
     */
    static async deleteInventory(id) {
        return performance_1.QueryAnalyzer.analyzeQuery(`InventoryService.deleteInventory:${id}`, async () => {
            if (!mongoose_1.Types.ObjectId.isValid(id)) {
                throw new AppError_1.AppError("Invalid inventory ID", 400);
            }
            const inventory = await Inventory_1.Inventory.findByIdAndDelete(id);
            if (!inventory) {
                throw new AppError_1.AppError("Inventory not found", 404);
            }
            // Delete related history
            await InventoryHistory_1.InventoryHistory.deleteMany({ inventoryId: new mongoose_1.Types.ObjectId(id) });
            // Invalidate cache
            await this.cache.del("inventory_list");
            await this.cache.del(`inventory:${id}`);
            logger_1.logger.info(`Inventory deleted: ${id}`);
        });
    }
    /**
     * Adjust stock (import/export)
     */
    static async adjustStock(adjustmentData, userId) {
        return performance_1.QueryAnalyzer.analyzeQuery(`InventoryService.adjustStock:${adjustmentData.inventoryId}`, async () => {
            if (!mongoose_1.Types.ObjectId.isValid(adjustmentData.inventoryId)) {
                throw new AppError_1.AppError("Invalid inventory ID", 400);
            }
            const inventory = await Inventory_1.Inventory.findById(adjustmentData.inventoryId);
            if (!inventory) {
                throw new AppError_1.AppError("Inventory not found", 404);
            }
            // Calculate new quantity
            const newQuantity = adjustmentData.type === "import"
                ? inventory.quantity + adjustmentData.amount
                : inventory.quantity - adjustmentData.amount;
            if (newQuantity < 0) {
                throw new AppError_1.AppError("Số lượng tồn kho không đủ để xuất", 400);
            }
            // Update inventory
            inventory.quantity = newQuantity;
            inventory.lastUpdated = new Date();
            inventory.updatedBy = userId ? new mongoose_1.Types.ObjectId(userId) : undefined;
            await inventory.save();
            // Create history record
            const history = await InventoryHistory_1.InventoryHistory.create({
                inventoryId: inventory._id,
                itemName: inventory.name,
                type: adjustmentData.type,
                amount: adjustmentData.amount,
                unit: inventory.unit,
                partner: adjustmentData.partner,
                createdBy: userId ? new mongoose_1.Types.ObjectId(userId) : undefined,
            });
            // Invalidate cache
            await this.cache.del("inventory_list");
            await this.cache.del(`inventory:${adjustmentData.inventoryId}`);
            await this.historyCache.del("inventory_history_list");
            logger_1.logger.info(`Stock adjusted: ${adjustmentData.inventoryId}, type: ${adjustmentData.type}, amount: ${adjustmentData.amount}`);
            return { inventory, history };
        });
    }
    /**
     * Get inventory statistics
     */
    static async getInventoryStats() {
        return performance_1.QueryAnalyzer.analyzeQuery("InventoryService.getInventoryStats", async () => {
            const inventories = await Inventory_1.Inventory.find({}).lean();
            const totalJars = inventories.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const totalValue = inventories.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
            const totalWeightKg = inventories.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.netWeight || 0)) / 1000, 0);
            const lowStock = inventories.filter((item) => item.quantity < item.minStock).length;
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
    static async getInventoryHistory(filters = {}, query = {}) {
        return performance_1.QueryAnalyzer.analyzeQuery("InventoryService.getInventoryHistory", async () => {
            const page = query.page || 1;
            const limit = query.limit || 100;
            const sort = query.sort || "createdAt";
            const order = query.order || "desc";
            // Build filter query
            const filterQuery = {};
            if (filters.inventoryId) {
                if (!mongoose_1.Types.ObjectId.isValid(filters.inventoryId)) {
                    throw new AppError_1.AppError("Invalid inventory ID", 400);
                }
                filterQuery.inventoryId = new mongoose_1.Types.ObjectId(filters.inventoryId);
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
            const sortOptions = {};
            sortOptions[sort] = order === "asc" ? 1 : -1;
            // Build query
            const query = InventoryHistory_1.InventoryHistory.find(filterQuery).sort(sortOptions);
            // Execute query with pagination
            const result = await (0, pagination_1.paginateQuery)(query, {
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
exports.InventoryService = InventoryService;
