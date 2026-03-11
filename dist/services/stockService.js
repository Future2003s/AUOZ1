"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const StockLedger_1 = require("../models/StockLedger");
const StockSnapshot_1 = require("../models/StockSnapshot");
const LotNumber_1 = require("../models/LotNumber");
const Inventory_1 = require("../models/Inventory");
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [new winston_1.default.transports.Console()],
});
/**
 * Stock Service — all inventory movement business logic.
 * All monetary values are integer cents. No floats for money.
 */
exports.stockService = {
    /**
     * Record a stock movement:
     * 1. Validates negative stock constraint
     * 2. Writes an immutable StockLedger entry
     * 3. Atomically updates the StockSnapshot
     * Always call within a MongoDB session for multi-document safety.
     */
    async recordMovement(params) {
        const { itemId, locationId, warehouseId, movementType, qty, unitCostCents, uomId, lotId, referenceId, referenceType, referenceNo, note, userId, session, } = params;
        const isInbound = [
            "RECEIPT", "TRANSFER_IN", "ADJUSTMENT_IN", "RETURN_IN", "OPENING",
        ].includes(movementType);
        const isOutbound = [
            "ISSUE", "TRANSFER_OUT", "ADJUSTMENT_OUT", "RETURN_OUT", "SCRAP",
        ].includes(movementType);
        const signedQty = isInbound ? Math.abs(qty) : -Math.abs(qty);
        // Guard: check negative stock before writing
        if (isOutbound) {
            await this.assertSufficientStock(itemId, locationId, qty, session);
        }
        // Get current balance for running total
        const snapshot = await StockSnapshot_1.StockSnapshot.findOne({ itemId, locationId }, { qtyOnHand: 1, avgCostCents: 1 }, { session });
        const currentBalance = snapshot?.qtyOnHand ?? 0;
        const newBalance = currentBalance + signedQty;
        // Calculate updated weighted-average cost (for inbound only)
        let newAvgCost = snapshot?.avgCostCents ?? 0;
        if (isInbound && signedQty > 0) {
            const currentValue = currentBalance * newAvgCost;
            const incomingValue = signedQty * unitCostCents;
            newAvgCost = Math.round((currentValue + incomingValue) / newBalance);
        }
        const totalCostCents = Math.abs(signedQty) * (isInbound ? unitCostCents : newAvgCost);
        // Write ledger entry (immutable)
        const [ledgerEntry] = await StockLedger_1.StockLedger.create([
            {
                referenceId: referenceId ? new mongoose_1.default.Types.ObjectId(referenceId) : undefined,
                referenceType,
                referenceNo,
                itemId: new mongoose_1.default.Types.ObjectId(itemId),
                locationId: new mongoose_1.default.Types.ObjectId(locationId),
                lotId: lotId ? new mongoose_1.default.Types.ObjectId(lotId) : undefined,
                movementType,
                qty: signedQty,
                qtyBalance: newBalance,
                unitCostCents,
                totalCostCents,
                uomId: new mongoose_1.default.Types.ObjectId(uomId),
                note,
                createdBy: new mongoose_1.default.Types.ObjectId(userId),
            },
        ], { session });
        // Upsert stock snapshot atomically
        await StockSnapshot_1.StockSnapshot.findOneAndUpdate({ itemId: new mongoose_1.default.Types.ObjectId(itemId), locationId: new mongoose_1.default.Types.ObjectId(locationId) }, {
            $set: {
                warehouseId: new mongoose_1.default.Types.ObjectId(warehouseId),
                qtyOnHand: newBalance,
                qtyAvailable: newBalance - (snapshot?.qtyReserved ?? 0),
                avgCostCents: newAvgCost,
                totalValueCents: newBalance * newAvgCost,
                lastMovementAt: new Date(),
                lastLedgerId: ledgerEntry._id,
            },
        }, { upsert: true, new: true, session });
        // Update lot remaining quantity
        if (lotId && isOutbound) {
            await LotNumber_1.LotNumber.findByIdAndUpdate(lotId, { $inc: { qtyRemaining: -Math.abs(qty) } }, { session });
        }
        logger.info("Stock movement recorded", {
            ledgerEntryId: ledgerEntry._id,
            itemId,
            locationId,
            movementType,
            qty: signedQty,
            newBalance,
        });
        return ledgerEntry;
    },
    /**
     * Throws an AppError if current stock is insufficient for the requested qty.
     */
    async assertSufficientStock(itemId, locationId, requestedQty, session) {
        const snapshot = await StockSnapshot_1.StockSnapshot.findOne({
            itemId: new mongoose_1.default.Types.ObjectId(itemId),
            locationId: new mongoose_1.default.Types.ObjectId(locationId),
        }, { qtyAvailable: 1 }, { session });
        const available = snapshot?.qtyAvailable ?? 0;
        if (available < requestedQty) {
            const item = await Inventory_1.Inventory.findById(itemId, { name: 1, sku: 1 });
            const label = item ? `${item.name} (${item.sku ?? itemId})` : itemId;
            throw Object.assign(new Error(`Insufficient stock for ${label}. Available: ${available}, requested: ${requestedQty}`), { statusCode: 400, code: "INSUFFICIENT_STOCK" });
        }
    },
    /**
     * Aggregate stock across all locations for a given item.
     */
    async getStockSummary(itemId) {
        const snapshots = await StockSnapshot_1.StockSnapshot.find({ itemId: new mongoose_1.default.Types.ObjectId(itemId) }, { locationId: 1, warehouseId: 1, qtyOnHand: 1, qtyReserved: 1, qtyAvailable: 1, avgCostCents: 1 }).lean();
        const totalOnHand = snapshots.reduce((acc, s) => acc + s.qtyOnHand, 0);
        const totalReserved = snapshots.reduce((acc, s) => acc + s.qtyReserved, 0);
        const totalValue = snapshots.reduce((acc, s) => acc + s.qtyOnHand * s.avgCostCents, 0);
        return {
            itemId,
            totalOnHand,
            totalReserved,
            totalAvailable: totalOnHand - totalReserved,
            avgCostCents: totalOnHand > 0 ? Math.round(totalValue / totalOnHand) : 0,
            totalValueCents: Math.round(totalValue),
            byLocation: snapshots.map((s) => ({
                locationId: s.locationId.toString(),
                warehouseId: s.warehouseId.toString(),
                onHand: s.qtyOnHand,
                reserved: s.qtyReserved,
                available: s.qtyAvailable,
            })),
        };
    },
    /**
     * Calculate FIFO inventory value for an item.
     * Reconstructs cost layers from StockLedger RECEIPT entries,
     * then deducts ISSUE/SCRAP/etc. entries against oldest layers first.
     */
    async calculateFIFOValue(itemId) {
        const entries = await StockLedger_1.StockLedger.find({ itemId: new mongoose_1.default.Types.ObjectId(itemId) }, { movementType: 1, qty: 1, unitCostCents: 1, lotId: 1, createdAt: 1 })
            .sort({ createdAt: 1 })
            .lean();
        const layers = [];
        for (const entry of entries) {
            const isIn = entry.qty > 0;
            const isOut = entry.qty < 0;
            if (isIn) {
                layers.push({
                    lotId: entry.lotId?.toString(),
                    receivedAt: entry.createdAt,
                    originalQty: entry.qty,
                    remainingQty: entry.qty,
                    unitCostCents: entry.unitCostCents,
                    totalValueCents: entry.qty * entry.unitCostCents,
                });
            }
            else if (isOut) {
                let remaining = Math.abs(entry.qty);
                for (const layer of layers) {
                    if (remaining <= 0)
                        break;
                    if (layer.remainingQty <= 0)
                        continue;
                    const consumed = Math.min(layer.remainingQty, remaining);
                    layer.remainingQty -= consumed;
                    layer.totalValueCents = layer.remainingQty * layer.unitCostCents;
                    remaining -= consumed;
                }
            }
        }
        const activeLayers = layers.filter((l) => l.remainingQty > 0);
        const totalQty = activeLayers.reduce((acc, l) => acc + l.remainingQty, 0);
        const totalValueCents = activeLayers.reduce((acc, l) => acc + l.totalValueCents, 0);
        return {
            itemId,
            layers: activeLayers,
            totalQty,
            totalValueCents,
            avgCostCents: totalQty > 0 ? Math.round(totalValueCents / totalQty) : 0,
        };
    },
    /**
     * Get movement history for an item with pagination.
     */
    async getMovementHistory(itemId, options) {
        const { page, limit, locationId } = options;
        const filter = { itemId: new mongoose_1.default.Types.ObjectId(itemId) };
        if (locationId)
            filter.locationId = new mongoose_1.default.Types.ObjectId(locationId);
        const [entries, total] = await Promise.all([
            StockLedger_1.StockLedger.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("locationId", "code name")
                .populate("lotId", "lotNo expiryDate")
                .populate("createdBy", "name email")
                .lean(),
            StockLedger_1.StockLedger.countDocuments(filter),
        ]);
        return { entries, total, page, limit };
    },
};
