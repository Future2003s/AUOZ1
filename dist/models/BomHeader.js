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
exports.BomHeader = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const BomHeaderSchema = new mongoose_1.Schema({
    bomNo: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 30,
    },
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Inventory", required: true },
    version: { type: Number, required: true, default: 1, min: 1 },
    status: {
        type: String,
        enum: ["DRAFT", "ACTIVE", "OBSOLETE"],
        default: "DRAFT",
    },
    description: { type: String, trim: true, maxlength: 1000 },
    effectivityStart: { type: Date, default: null },
    effectivityEnd: { type: Date, default: null },
    outputQty: { type: Number, required: true, default: 1, min: 0.0001 },
    outputUomId: { type: mongoose_1.Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
    totalMaterialCostCents: { type: Number, default: 0, min: 0 },
    isDefault: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
BomHeaderSchema.index({ bomNo: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
BomHeaderSchema.index({ productId: 1, version: -1 });
BomHeaderSchema.index({ productId: 1, status: 1 });
BomHeaderSchema.index({ isDeleted: 1, status: 1 });
exports.BomHeader = mongoose_1.default.model("BomHeader", BomHeaderSchema);
