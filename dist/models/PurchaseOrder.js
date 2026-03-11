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
exports.PurchaseOrder = exports.PurchaseOrderLine = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PurchaseOrderLineSchema = new mongoose_1.Schema({
    poId: { type: mongoose_1.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    prLineRef: { type: mongoose_1.Schema.Types.ObjectId, default: null },
    itemId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Inventory", required: true },
    description: { type: String, trim: true, maxlength: 200 },
    qty: { type: Number, required: true, min: 0.0001 },
    unitPriceCents: { type: Number, required: true, min: 0 },
    uomId: { type: mongoose_1.Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
    promisedDate: { type: Date, default: null },
    qtyReceived: { type: Number, default: 0, min: 0 },
    lineTotalCents: { type: Number, required: true, min: 0 },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
PurchaseOrderLineSchema.index({ poId: 1 });
PurchaseOrderLineSchema.index({ itemId: 1 });
const PurchaseOrderSchema = new mongoose_1.Schema({
    poNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    prId: { type: mongoose_1.Schema.Types.ObjectId, ref: "PurchaseRequisition", default: null },
    vendorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Vendor", required: true },
    status: {
        type: String,
        enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "PARTIAL", "RECEIVED", "CANCELLED"],
        default: "DRAFT",
    },
    currency: { type: String, trim: true, uppercase: true, default: "VND", maxlength: 3 },
    paymentTermsDays: { type: Number, default: 30, min: 0 },
    expectedDeliveryDate: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 1000 },
    totalAmountCents: { type: Number, default: 0, min: 0 },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
PurchaseOrderSchema.index({ poNo: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
PurchaseOrderSchema.index({ vendorId: 1, status: 1 });
PurchaseOrderSchema.index({ status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ prId: 1 });
PurchaseOrderSchema.index({ isDeleted: 1, status: 1 });
exports.PurchaseOrderLine = mongoose_1.default.model("PurchaseOrderLine", PurchaseOrderLineSchema);
exports.PurchaseOrder = mongoose_1.default.model("PurchaseOrder", PurchaseOrderSchema);
