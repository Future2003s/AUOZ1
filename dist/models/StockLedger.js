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
exports.StockLedger = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StockLedgerSchema = new mongoose_1.Schema({
    referenceId: { type: mongoose_1.Schema.Types.ObjectId },
    referenceType: { type: String, trim: true, maxlength: 50 },
    referenceNo: { type: String, trim: true, maxlength: 50 },
    itemId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Inventory",
        required: [true, "Item is required"],
    },
    locationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "WarehouseLocation",
        required: [true, "Location is required"],
    },
    lotId: { type: mongoose_1.Schema.Types.ObjectId, ref: "LotNumber", default: null },
    movementType: {
        type: String,
        required: true,
        enum: [
            "RECEIPT",
            "ISSUE",
            "TRANSFER_IN",
            "TRANSFER_OUT",
            "ADJUSTMENT_IN",
            "ADJUSTMENT_OUT",
            "RETURN_IN",
            "RETURN_OUT",
            "OPENING",
            "SCRAP",
        ],
    },
    qty: { type: Number, required: true },
    qtyBalance: { type: Number, required: true },
    unitCostCents: { type: Number, required: true, min: 0, default: 0 },
    totalCostCents: { type: Number, required: true, default: 0 },
    uomId: { type: mongoose_1.Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
    note: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, {
    timestamps: { createdAt: true, updatedAt: false }, // immutable
});
// Critical indexes for ledger queries
StockLedgerSchema.index({ itemId: 1, locationId: 1, createdAt: -1 });
StockLedgerSchema.index({ itemId: 1, createdAt: -1 });
StockLedgerSchema.index({ referenceId: 1, referenceType: 1 });
StockLedgerSchema.index({ movementType: 1, createdAt: -1 });
StockLedgerSchema.index({ lotId: 1 });
exports.StockLedger = mongoose_1.default.model("StockLedger", StockLedgerSchema);
