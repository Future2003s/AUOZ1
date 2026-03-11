import mongoose, { Document, Schema } from "mongoose";

/**
 * StockLedger — Immutable event log of all stock movements.
 * NEVER update or delete a ledger entry. To reverse, create a counter-entry.
 */
export type MovementType =
    | "RECEIPT"          // goods received from purchase order
    | "ISSUE"            // goods issued to production / internal use
    | "TRANSFER_IN"      // received from another location
    | "TRANSFER_OUT"     // sent to another location
    | "ADJUSTMENT_IN"    // positive inventory adjustment
    | "ADJUSTMENT_OUT"   // negative inventory adjustment
    | "RETURN_IN"        // customer return received
    | "RETURN_OUT"       // return to vendor
    | "OPENING"          // opening balance entry
    | "SCRAP";           // scrap / write-off

export interface IStockLedger extends Document {
    /** Source document: GR id, Transfer id, etc. */
    referenceId?: mongoose.Types.ObjectId;
    referenceType?: string;
    referenceNo?: string;        // human-readable doc number
    itemId: mongoose.Types.ObjectId;
    locationId: mongoose.Types.ObjectId;
    lotId?: mongoose.Types.ObjectId;
    movementType: MovementType;
    /** Positive = stock IN, negative = stock OUT */
    qty: number;
    /** Running balance after this entry (per item+location) */
    qtyBalance: number;
    /** Cost per unit in integer cents (VND) */
    unitCostCents: number;
    /** Total cost in integer cents */
    totalCostCents: number;
    uomId: mongoose.Types.ObjectId;
    note?: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    // updatedAt intentionally omitted — ledger is immutable
}

const StockLedgerSchema = new Schema<IStockLedger>(
    {
        referenceId: { type: Schema.Types.ObjectId },
        referenceType: { type: String, trim: true, maxlength: 50 },
        referenceNo: { type: String, trim: true, maxlength: 50 },
        itemId: {
            type: Schema.Types.ObjectId,
            ref: "Inventory",
            required: [true, "Item is required"],
        },
        locationId: {
            type: Schema.Types.ObjectId,
            ref: "WarehouseLocation",
            required: [true, "Location is required"],
        },
        lotId: { type: Schema.Types.ObjectId, ref: "LotNumber", default: null },
        movementType: {
            type: String,
            required: true,
            enum: [
                "RECEIPT",
                "ISSUE",
                "TRANSFER_IN",
                "TRANSFER_OUT",
                "ADJUSTMENT_IN",
                "ADJUSTMENT_OUT",
                "RETURN_IN",
                "RETURN_OUT",
                "OPENING",
                "SCRAP",
            ],
        },
        qty: { type: Number, required: true },
        qtyBalance: { type: Number, required: true },
        unitCostCents: { type: Number, required: true, min: 0, default: 0 },
        totalCostCents: { type: Number, required: true, default: 0 },
        uomId: { type: Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
        note: { type: String, trim: true, maxlength: 500 },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // immutable
    }
);

// Critical indexes for ledger queries
StockLedgerSchema.index({ itemId: 1, locationId: 1, createdAt: -1 });
StockLedgerSchema.index({ itemId: 1, createdAt: -1 });
StockLedgerSchema.index({ referenceId: 1, referenceType: 1 });
StockLedgerSchema.index({ movementType: 1, createdAt: -1 });
StockLedgerSchema.index({ lotId: 1 });

export const StockLedger = mongoose.model<IStockLedger>("StockLedger", StockLedgerSchema);
