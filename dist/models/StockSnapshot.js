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
exports.StockSnapshot = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StockSnapshotSchema = new mongoose_1.Schema({
    itemId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Inventory", required: true },
    locationId: { type: mongoose_1.Schema.Types.ObjectId, ref: "WarehouseLocation", required: true },
    warehouseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    qtyOnHand: { type: Number, required: true, default: 0 },
    qtyReserved: { type: Number, required: true, default: 0, min: 0 },
    qtyAvailable: { type: Number, required: true, default: 0 },
    avgCostCents: { type: Number, required: true, default: 0, min: 0 },
    totalValueCents: { type: Number, required: true, default: 0 },
    lastMovementAt: { type: Date, default: Date.now },
    lastLedgerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "StockLedger" },
}, {
    timestamps: { createdAt: false, updatedAt: true },
});
// Composite unique index — one snapshot per item+location
StockSnapshotSchema.index({ itemId: 1, locationId: 1 }, { unique: true });
// For warehouse-level aggregation
StockSnapshotSchema.index({ warehouseId: 1, itemId: 1 });
// For low-stock queries
StockSnapshotSchema.index({ qtyAvailable: 1 });
exports.StockSnapshot = mongoose_1.default.model("StockSnapshot", StockSnapshotSchema);
