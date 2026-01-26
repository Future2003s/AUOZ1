import mongoose, { Document, Schema } from "mongoose";

export interface IInventory extends Document {
    name: string;
    quantity: number;
    unit: string;
    netWeight: number; // Trọng lượng tịnh (gram)
    minStock: number;
    price: number;
    location: string;
    category: string;
    lastUpdated: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
    {
        name: {
            type: String,
            required: [true, "Tên sản phẩm là bắt buộc"],
            trim: true,
            maxlength: [200, "Tên sản phẩm không được vượt quá 200 ký tự"],
        },
        quantity: {
            type: Number,
            required: [true, "Số lượng là bắt buộc"],
            min: [0, "Số lượng không được âm"],
            default: 0,
        },
        unit: {
            type: String,
            required: [true, "Đơn vị là bắt buộc"],
            default: "Lọ",
        },
        netWeight: {
            type: Number,
            required: [true, "Trọng lượng tịnh là bắt buộc"],
            min: [0, "Trọng lượng không được âm"],
            default: 165,
        },
        minStock: {
            type: Number,
            required: [true, "Tồn kho tối thiểu là bắt buộc"],
            min: [0, "Tồn kho tối thiểu không được âm"],
            default: 10,
        },
        price: {
            type: Number,
            required: [true, "Giá bán là bắt buộc"],
            min: [0, "Giá bán không được âm"],
        },
        location: {
            type: String,
            required: [true, "Vị trí kho là bắt buộc"],
            enum: ["Kho A", "Kho B", "Kho C"],
            default: "Kho A",
        },
        category: {
            type: String,
            required: [true, "Danh mục là bắt buộc"],
            enum: ["Thường", "Cao cấp", "Premium"],
            default: "Thường",
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for better query performance
InventorySchema.index({ name: 1 });
InventorySchema.index({ location: 1 });
InventorySchema.index({ category: 1 });
InventorySchema.index({ quantity: 1 });
InventorySchema.index({ lastUpdated: -1 });

export const Inventory = mongoose.model<IInventory>("Inventory", InventorySchema);
