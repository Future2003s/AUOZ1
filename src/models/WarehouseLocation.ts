import mongoose, { Document, Schema } from "mongoose";

export interface IWarehouseLocation extends Document {
    warehouseId: mongoose.Types.ObjectId;
    code: string;
    name: string;
    zone?: string;    // e.g. "A", "B", "COLD"
    aisle?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
    isActive: boolean;
    isDeleted: boolean;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const WarehouseLocationSchema = new Schema<IWarehouseLocation>(
    {
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: "Warehouse",
            required: [true, "Warehouse is required"],
        },
        code: {
            type: String,
            required: [true, "Location code is required"],
            trim: true,
            uppercase: true,
            maxlength: [30, "Code must be ≤ 30 characters"],
        },
        name: {
            type: String,
            required: [true, "Location name is required"],
            trim: true,
            maxlength: [100, "Name must be ≤ 100 characters"],
        },
        zone: { type: String, trim: true, maxlength: 20 },
        aisle: { type: String, trim: true, maxlength: 10 },
        rack: { type: String, trim: true, maxlength: 10 },
        shelf: { type: String, trim: true, maxlength: 10 },
        bin: { type: String, trim: true, maxlength: 10 },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

WarehouseLocationSchema.index({ warehouseId: 1, code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
WarehouseLocationSchema.index({ warehouseId: 1, isDeleted: 1 });
WarehouseLocationSchema.index({ isDeleted: 1, isActive: 1 });

export const WarehouseLocation = mongoose.model<IWarehouseLocation>("WarehouseLocation", WarehouseLocationSchema);
