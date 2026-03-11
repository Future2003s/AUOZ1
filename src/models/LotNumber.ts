import mongoose, { Document, Schema } from "mongoose";

export interface ILotNumber extends Document {
    lotNo: string;                            // e.g. "LOT-2026-0001"
    itemId: mongoose.Types.ObjectId;
    supplierId?: mongoose.Types.ObjectId;
    manufacturingDate?: Date;
    expiryDate?: Date;
    qty: number;
    qtyRemaining: number;
    unitCostCents: number;                    // cost per unit in cents
    status: "ACTIVE" | "QUARANTINE" | "EXPIRED" | "EXHAUSTED";
    attributes?: Record<string, string>;      // flexible lot attributes
    isDeleted: boolean;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const LotNumberSchema = new Schema<ILotNumber>(
    {
        lotNo: {
            type: String,
            required: [true, "Lot number is required"],
            trim: true,
            uppercase: true,
            maxlength: [50, "Lot number must be ≤ 50 characters"],
        },
        itemId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true },
        supplierId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
        manufacturingDate: { type: Date, default: null },
        expiryDate: { type: Date, default: null },
        qty: { type: Number, required: true, min: 0 },
        qtyRemaining: { type: Number, required: true, min: 0 },
        unitCostCents: { type: Number, required: true, min: 0, default: 0 },
        status: {
            type: String,
            enum: ["ACTIVE", "QUARANTINE", "EXPIRED", "EXHAUSTED"],
            default: "ACTIVE",
        },
        attributes: { type: Schema.Types.Mixed, default: {} },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

LotNumberSchema.index({ lotNo: 1, itemId: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
LotNumberSchema.index({ itemId: 1, status: 1 });
LotNumberSchema.index({ expiryDate: 1, status: 1 });
LotNumberSchema.index({ supplierId: 1 });

export const LotNumber = mongoose.model<ILotNumber>("LotNumber", LotNumberSchema);
