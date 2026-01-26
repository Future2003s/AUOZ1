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
exports.InventoryHistory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const InventoryHistorySchema = new mongoose_1.Schema({
    inventoryId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes for better query performance
InventoryHistorySchema.index({ inventoryId: 1, createdAt: -1 });
InventoryHistorySchema.index({ type: 1 });
InventoryHistorySchema.index({ createdAt: -1 });
exports.InventoryHistory = mongoose_1.default.model("InventoryHistory", InventoryHistorySchema);
