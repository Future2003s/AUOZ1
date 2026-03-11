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
exports.PurchaseRequisition = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PRLineSchema = new mongoose_1.Schema({
    itemId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Inventory", required: true },
    description: { type: String, trim: true, maxlength: 200 },
    qty: { type: Number, required: true, min: 0.0001 },
    uomId: { type: mongoose_1.Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
    estimatedPriceCents: { type: Number, required: true, min: 0, default: 0 },
    neededBy: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 300 },
}, { _id: true });
const PurchaseRequisitionSchema = new mongoose_1.Schema({
    prNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    status: {
        type: String,
        enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED", "CONVERTED"],
        default: "DRAFT",
    },
    requestedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    neededBy: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 1000 },
    lines: {
        type: [PRLineSchema],
        required: true,
        validate: {
            validator: (lines) => lines.length > 0,
            message: "Purchase Requisition must have at least one line item",
        },
    },
    totalEstimatedCents: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
PurchaseRequisitionSchema.index({ prNo: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
PurchaseRequisitionSchema.index({ status: 1, createdAt: -1 });
PurchaseRequisitionSchema.index({ requestedBy: 1 });
PurchaseRequisitionSchema.index({ isDeleted: 1, status: 1 });
exports.PurchaseRequisition = mongoose_1.default.model("PurchaseRequisition", PurchaseRequisitionSchema);
