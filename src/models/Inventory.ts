import mongoose, { Document, Schema } from "mongoose";

export interface IInventory extends Document {
    name: string;
    quantity: number;          // Hàng tốt (normal)
    defectiveQty: number;      // Hàng lỗi
    returnedQty: number;       // Hàng trả lại
    damagedQty: number;        // Hàng hư hỏng / hủy
    pendingCheckQty: number;   // Chờ kiểm tra
    soldQty: number;           // Tổng đã bán (cumulative)
    unit: string;
    netWeight: number;         // Trọng lượng tịnh (gram)
    minStock: number;
    price: number;
    location: string;
    category: string;
    productId?: mongoose.Types.ObjectId;  // Link to Product (optional)
    lastUpdated: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    // Virtuals
    totalStock: number;
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
        defectiveQty: {
            type: Number,
            min: [0, "Số lượng không được âm"],
            default: 0,
        },
        returnedQty: {
            type: Number,
            min: [0, "Số lượng không được âm"],
            default: 0,
        },
        damagedQty: {
            type: Number,
            min: [0, "Số lượng không được âm"],
            default: 0,
        },
        pendingCheckQty: {
            type: Number,
            min: [0, "Số lượng không được âm"],
            default: 0,
        },
        soldQty: {
            type: Number,
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
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            default: null,
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

// Virtual: tổng stock across all statuses
InventorySchema.virtual("totalStock").get(function () {
    return (
        (this.quantity || 0) +
        (this.defectiveQty || 0) +
        (this.returnedQty || 0) +
        (this.damagedQty || 0) +
        (this.pendingCheckQty || 0)
    );
});

// Indexes for better query performance
InventorySchema.index({ name: 1 });
InventorySchema.index({ location: 1 });
InventorySchema.index({ category: 1 });
InventorySchema.index({ quantity: 1 });
InventorySchema.index({ lastUpdated: -1 });
InventorySchema.index({ productId: 1 });

export const Inventory = mongoose.model<IInventory>("Inventory", InventorySchema);
