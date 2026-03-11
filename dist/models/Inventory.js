"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inventory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const InventorySchema = new mongoose_1.Schema({
    sku: {
        type: String,
        trim: true,
        sparse: true,
        index: true,
    },
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
    importedQty: {
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
        default: "Thường",
    },
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Virtual: tổng stock across all statuses
InventorySchema.virtual("totalStock").get(function () {
    return ((this.quantity || 0) +
        (this.defectiveQty || 0) +
        (this.returnedQty || 0) +
        (this.damagedQty || 0) +
        (this.pendingCheckQty || 0));
});
// Indexes for better query performance
InventorySchema.index({ name: 1 });
InventorySchema.index({ location: 1 });
InventorySchema.index({ category: 1 });
InventorySchema.index({ quantity: 1 });
InventorySchema.index({ lastUpdated: -1 });
InventorySchema.index({ productId: 1 });
exports.Inventory = mongoose_1.default.model("Inventory", InventorySchema);
