import mongoose, { Document, Schema } from "mongoose";

export type BomStatus = "DRAFT" | "ACTIVE" | "OBSOLETE";

export interface IBomHeader extends Document {
    /** Auto-generated document number: BOM-2026-0001 */
    bomNo: string;
    /** The finished product this BOM produces */
    productId: mongoose.Types.ObjectId;
    /** Semantic version: 1, 2, 3... */
    version: number;
    status: BomStatus;
    description?: string;
    effectivityStart?: Date;
    effectivityEnd?: Date;
    /** Default output quantity (typically 1) */
    outputQty: number;
    outputUomId: mongoose.Types.ObjectId;
    /** Aggregate component cost in cents (calculated, denormalized) */
    totalMaterialCostCents: number;
    isDefault: boolean;     // is this the active BOM for the product?
    isDeleted: boolean;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BomHeaderSchema = new Schema<IBomHeader>(
    {
        bomNo: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 30,
        },
        productId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true },
        version: { type: Number, required: true, default: 1, min: 1 },
        status: {
            type: String,
            enum: ["DRAFT", "ACTIVE", "OBSOLETE"],
            default: "DRAFT",
        },
        description: { type: String, trim: true, maxlength: 1000 },
        effectivityStart: { type: Date, default: null },
        effectivityEnd: { type: Date, default: null },
        outputQty: { type: Number, required: true, default: 1, min: 0.0001 },
        outputUomId: { type: Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
        totalMaterialCostCents: { type: Number, default: 0, min: 0 },
        isDefault: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

BomHeaderSchema.index({ bomNo: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
BomHeaderSchema.index({ productId: 1, version: -1 });
BomHeaderSchema.index({ productId: 1, status: 1 });
BomHeaderSchema.index({ isDeleted: 1, status: 1 });

export const BomHeader = mongoose.model<IBomHeader>("BomHeader", BomHeaderSchema);
