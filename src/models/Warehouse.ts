import mongoose, { Document, Schema } from "mongoose";

export interface IWarehouse extends Document {
    code: string;
    name: string;
    address?: string;
    city?: string;
    isDefault: boolean;
    isActive: boolean;
    isDeleted: boolean;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
    {
        code: {
            type: String,
            required: [true, "Warehouse code is required"],
            trim: true,
            uppercase: true,
            maxlength: [20, "Code must be ≤ 20 characters"],
        },
        name: {
            type: String,
            required: [true, "Warehouse name is required"],
            trim: true,
            maxlength: [100, "Name must be ≤ 100 characters"],
        },
        address: { type: String, trim: true, maxlength: 300 },
        city: { type: String, trim: true, maxlength: 100 },
        isDefault: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

WarehouseSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
WarehouseSchema.index({ isDeleted: 1, isActive: 1 });
WarehouseSchema.index({ isDefault: 1 });

export const Warehouse = mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);
