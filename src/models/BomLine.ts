import mongoose, { Document, Schema } from "mongoose";

/**
 * BomLine — One component/material row in a BOM.
 * Supports multi-level via parentLineId (NULL = top-level component).
 */
export interface IBomLine extends Document {
    bomId: mongoose.Types.ObjectId;
    /** NULL = direct child of BOM product; non-null = child of another BomLine */
    parentLineId?: mongoose.Types.ObjectId;
    componentId: mongoose.Types.ObjectId;   // ref to Inventory (item)
    qty: number;                             // quantity per parent output qty
    uomId: mongoose.Types.ObjectId;
    /**
     * Scrap percentage in basis points (integer): 500 = 5%, 1000 = 10%.
     * Effective qty = qty × (1 + scrapBps / 10000)
     */
    scrapBps: number;
    level: number;           // 1 = direct component, 2 = sub-component, ...
    sortOrder: number;
    unitCostCents: number;   // denormalized for fast cost rollup
    totalCostCents: number;  // qty × unitCostCents × (1 + scrapBps/10000)
    note?: string;
    isDeleted: boolean;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BomLineSchema = new Schema<IBomLine>(
    {
        bomId: { type: Schema.Types.ObjectId, ref: "BomHeader", required: true },
        parentLineId: { type: Schema.Types.ObjectId, ref: "BomLine", default: null },
        componentId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true },
        qty: { type: Number, required: true, min: 0.0001 },
        uomId: { type: Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
        scrapBps: { type: Number, required: true, default: 0, min: 0, max: 100000 },
        level: { type: Number, required: true, default: 1, min: 1 },
        sortOrder: { type: Number, default: 0 },
        unitCostCents: { type: Number, default: 0, min: 0 },
        totalCostCents: { type: Number, default: 0, min: 0 },
        note: { type: String, trim: true, maxlength: 300 },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

BomLineSchema.index({ bomId: 1, level: 1, sortOrder: 1 });
BomLineSchema.index({ bomId: 1, componentId: 1 });
BomLineSchema.index({ componentId: 1 });            // for where-used queries
BomLineSchema.index({ parentLineId: 1 });
BomLineSchema.index({ bomId: 1, isDeleted: 1 });

export const BomLine = mongoose.model<IBomLine>("BomLine", BomLineSchema);
