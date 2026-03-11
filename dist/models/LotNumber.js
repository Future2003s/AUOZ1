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
exports.LotNumber = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LotNumberSchema = new mongoose_1.Schema({
    lotNo: {
        type: String,
        required: [true, "Lot number is required"],
        trim: true,
        uppercase: true,
        maxlength: [50, "Lot number must be ≤ 50 characters"],
    },
    itemId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Inventory", required: true },
    supplierId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Vendor", default: null },
    manufacturingDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    qty: { type: Number, required: true, min: 0 },
    qtyRemaining: { type: Number, required: true, min: 0 },
    unitCostCents: { type: Number, required: true, min: 0, default: 0 },
    status: {
        type: String,
        enum: ["ACTIVE", "QUARANTINE", "EXPIRED", "EXHAUSTED"],
        default: "ACTIVE",
    },
    attributes: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
LotNumberSchema.index({ lotNo: 1, itemId: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
LotNumberSchema.index({ itemId: 1, status: 1 });
LotNumberSchema.index({ expiryDate: 1, status: 1 });
LotNumberSchema.index({ supplierId: 1 });
exports.LotNumber = mongoose_1.default.model("LotNumber", LotNumberSchema);
