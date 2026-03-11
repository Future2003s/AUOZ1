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
exports.GoodsReceipt = exports.GoodsReceiptLine = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const GoodsReceiptLineSchema = new mongoose_1.Schema({
    grId: { type: mongoose_1.Schema.Types.ObjectId, ref: "GoodsReceipt", required: true },
    poLineId: { type: mongoose_1.Schema.Types.ObjectId, ref: "PurchaseOrderLine", required: true },
    itemId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Inventory", required: true },
    qtyReceived: { type: Number, required: true, min: 0 },
    qtyAccepted: { type: Number, required: true, min: 0 },
    qtyRejected: { type: Number, required: true, default: 0, min: 0 },
    uomId: { type: mongoose_1.Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
    locationId: { type: mongoose_1.Schema.Types.ObjectId, ref: "WarehouseLocation", required: true },
    lotId: { type: mongoose_1.Schema.Types.ObjectId, ref: "LotNumber", default: null },
    unitCostCents: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, maxlength: 300 },
}, { timestamps: true });
GoodsReceiptLineSchema.index({ grId: 1 });
GoodsReceiptLineSchema.index({ poLineId: 1 });
GoodsReceiptLineSchema.index({ itemId: 1 });
const GoodsReceiptSchema = new mongoose_1.Schema({
    grNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    poId: { type: mongoose_1.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    vendorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Vendor", required: true },
    status: {
        type: String,
        enum: ["DRAFT", "CONFIRMED", "CANCELLED"],
        default: "DRAFT",
    },
    receivedDate: { type: Date, required: true, default: Date.now },
    receivedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
GoodsReceiptSchema.index({ grNo: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
GoodsReceiptSchema.index({ poId: 1 });
GoodsReceiptSchema.index({ vendorId: 1, status: 1 });
GoodsReceiptSchema.index({ receivedDate: -1 });
GoodsReceiptSchema.index({ isDeleted: 1, status: 1 });
exports.GoodsReceiptLine = mongoose_1.default.model("GoodsReceiptLine", GoodsReceiptLineSchema);
exports.GoodsReceipt = mongoose_1.default.model("GoodsReceipt", GoodsReceiptSchema);
