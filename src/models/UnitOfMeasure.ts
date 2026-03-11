import mongoose, { Document, Schema } from "mongoose";

export interface IUomConversion {
    toUomId: mongoose.Types.ObjectId;
    factor: number;  // 1 of this UOM = factor of toUomId
}

export interface IUnitOfMeasure extends Document {
    code: string;
    name: string;
    type: "quantity" | "weight" | "volume" | "length" | "area" | "time" | "other";
    conversions: IUomConversion[];
    isActive: boolean;
    isDeleted: boolean;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const UomConversionSchema = new Schema<IUomConversion>(
    {
        toUomId: { type: Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
        factor: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const UnitOfMeasureSchema = new Schema<IUnitOfMeasure>(
    {
        code: {
            type: String,
            required: [true, "UOM code is required"],
            trim: true,
            uppercase: true,
            maxlength: [10, "Code must be ≤ 10 characters"],
        },
        name: {
            type: String,
            required: [true, "UOM name is required"],
            trim: true,
            maxlength: [50, "Name must be ≤ 50 characters"],
        },
        type: {
            type: String,
            required: true,
            enum: ["quantity", "weight", "volume", "length", "area", "time", "other"],
            default: "quantity",
        },
        conversions: { type: [UomConversionSchema], default: [] },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

UnitOfMeasureSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
UnitOfMeasureSchema.index({ isDeleted: 1, isActive: 1 });

export const UnitOfMeasure = mongoose.model<IUnitOfMeasure>("UnitOfMeasure", UnitOfMeasureSchema);
