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
exports.DefectiveReport = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DefectiveReportSchema = new mongoose_1.Schema({
    inventoryId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Inventory",
        required: [true, "ID sản phẩm kho là bắt buộc"],
    },
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
    },
    quantity: {
        type: Number,
        required: [true, "Số lượng là bắt buộc"],
        min: [1, "Số lượng phải lớn hơn 0"],
    },
    reason: {
        type: String,
        required: [true, "Lý do là bắt buộc"],
        trim: true,
        maxlength: [2000, "Lý do không vượt quá 2000 ký tự"],
    },
    images: [
        {
            type: String,
            trim: true,
        },
    ],
    severity: {
        type: String,
        required: [true, "Mức độ nghiêm trọng là bắt buộc"],
        enum: ["low", "medium", "high", "critical"],
        default: "medium",
    },
    status: {
        type: String,
        required: true,
        enum: ["pending", "inspecting", "resolved", "destroyed"],
        default: "pending",
    },
    resolution: {
        type: String,
        enum: ["repaired", "destroyed", "returned_to_supplier"],
    },
    resolutionNote: {
        type: String,
        trim: true,
        maxlength: [2000, "Ghi chú không vượt quá 2000 ký tự"],
    },
    resolvedQuantity: {
        type: Number,
        min: [0, "Số lượng không được âm"],
    },
    reportedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Người báo cáo là bắt buộc"],
    },
    resolvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    resolvedAt: {
        type: Date,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
DefectiveReportSchema.index({ inventoryId: 1, createdAt: -1 });
DefectiveReportSchema.index({ status: 1 });
DefectiveReportSchema.index({ severity: 1 });
DefectiveReportSchema.index({ reportedBy: 1 });
DefectiveReportSchema.index({ createdAt: -1 });
exports.DefectiveReport = mongoose_1.default.model("DefectiveReport", DefectiveReportSchema);
