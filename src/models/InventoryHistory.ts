import mongoose, { Document, Schema } from "mongoose";

export type InventoryTransactionType =
    | "import"
    | "export"
    | "defective"
    | "adjust"
    | "return"
    | "damaged"
    | "status_change"
    | "destroy";

export interface IInventoryHistory extends Document {
    inventoryId: mongoose.Types.ObjectId;
    itemName: string;
    type: InventoryTransactionType;
    amount: number;
    unit: string;
    partner?: string;
    reason?: string;
    images?: string[];
    fromStatus?: string;
    toStatus?: string;
    balanceBefore?: number;
    balanceAfter?: number;
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
            enum: [
                "import",
                "export",
                "defective",
                "adjust",
                "return",
                "damaged",
                "status_change",
                "destroy",
            ],
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
        reason: {
            type: String,
            trim: true,
            maxlength: [1000, "Lý do không vượt quá 1000 ký tự"],
        },
        images: [
            {
                type: String,
                trim: true,
            },
        ],
        fromStatus: {
            type: String,
            trim: true,
        },
        toStatus: {
            type: String,
            trim: true,
        },
        balanceBefore: {
            type: Number,
        },
        balanceAfter: {
            type: Number,
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
InventoryHistorySchema.index({ fromStatus: 1, toStatus: 1 });

export const InventoryHistory = mongoose.model<IInventoryHistory>(
    "InventoryHistory",
    InventoryHistorySchema
);
