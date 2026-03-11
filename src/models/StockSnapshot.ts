import mongoose, { Document, Schema } from "mongoose";

/**
 * StockSnapshot — Materialised current stock per (item, location).
 * Updated atomically whenever a StockLedger entry is written.
 * Use this for fast reads. Rebuild from StockLedger if ever inconsistent.
 */
export interface IStockSnapshot extends Document {
    itemId: mongoose.Types.ObjectId;
    locationId: mongoose.Types.ObjectId;
    warehouseId: mongoose.Types.ObjectId;
    qtyOnHand: number;        // confirmed stock
    qtyReserved: number;      // reserved for orders/production
    qtyAvailable: number;     // qtyOnHand - qtyReserved
    /** Weighted-average cost in integer cents */
    avgCostCents: number;
    /** Total stock value = qtyOnHand × avgCostCents */
    totalValueCents: number;
    lastMovementAt: Date;
    lastLedgerId: mongoose.Types.ObjectId;
    updatedAt: Date;
}

const StockSnapshotSchema = new Schema<IStockSnapshot>(
    {
        itemId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true },
        locationId: { type: Schema.Types.ObjectId, ref: "WarehouseLocation", required: true },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
        qtyOnHand: { type: Number, required: true, default: 0 },
        qtyReserved: { type: Number, required: true, default: 0, min: 0 },
        qtyAvailable: { type: Number, required: true, default: 0 },
        avgCostCents: { type: Number, required: true, default: 0, min: 0 },
        totalValueCents: { type: Number, required: true, default: 0 },
        lastMovementAt: { type: Date, default: Date.now },
        lastLedgerId: { type: Schema.Types.ObjectId, ref: "StockLedger" },
    },
    {
        timestamps: { createdAt: false, updatedAt: true },
    }
);

// Composite unique index — one snapshot per item+location
StockSnapshotSchema.index({ itemId: 1, locationId: 1 }, { unique: true });
// For warehouse-level aggregation
StockSnapshotSchema.index({ warehouseId: 1, itemId: 1 });
// For low-stock queries
StockSnapshotSchema.index({ qtyAvailable: 1 });

export const StockSnapshot = mongoose.model<IStockSnapshot>("StockSnapshot", StockSnapshotSchema);
