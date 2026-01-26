import mongoose, { Document, Schema } from "mongoose";

export interface IInventoryHistory extends Document {
    inventoryId: mongoose.Types.ObjectId;
    itemName: string;
    type: "import" | "export";
    amount: number;
    unit: string;
    partner?: string;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const InventoryHistorySchema = new Schema<IInventoryHistory>(
    {
        inventoryId: {
            type: Schema.Types.ObjectId,
            ref: "Inventory",
            required: [true, "ID sản phẩm là bắt buộc"],
        },
        itemName: {
            type: String,
            required: [true, "Tên sản phẩm là bắt buộc"],
            trim: true,
        },
        type: {
            type: String,
            required: [true, "Loại giao dịch là bắt buộc"],
            enum: ["import", "export"],
        },
        amount: {
            type: Number,
            required: [true, "Số lượng là bắt buộc"],
            min: [1, "Số lượng phải lớn hơn 0"],
        },
        unit: {
            type: String,
            required: [true, "Đơn vị là bắt buộc"],
            default: "Lọ",
        },
        partner: {
            type: String,
            trim: true,
        },
        createdBy: {
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
InventoryHistorySchema.index({ inventoryId: 1, createdAt: -1 });
InventoryHistorySchema.index({ type: 1 });
InventoryHistorySchema.index({ createdAt: -1 });

export const InventoryHistory = mongoose.model<IInventoryHistory>("InventoryHistory", InventoryHistorySchema);
