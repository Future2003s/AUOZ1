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
exports.BomLine = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const BomLineSchema = new mongoose_1.Schema({
    bomId: { type: mongoose_1.Schema.Types.ObjectId, ref: "BomHeader", required: true },
    parentLineId: { type: mongoose_1.Schema.Types.ObjectId, ref: "BomLine", default: null },
    componentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Inventory", required: true },
    qty: { type: Number, required: true, min: 0.0001 },
    uomId: { type: mongoose_1.Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
    scrapBps: { type: Number, required: true, default: 0, min: 0, max: 100000 },
    level: { type: Number, required: true, default: 1, min: 1 },
    sortOrder: { type: Number, default: 0 },
    unitCostCents: { type: Number, default: 0, min: 0 },
    totalCostCents: { type: Number, default: 0, min: 0 },
    note: { type: String, trim: true, maxlength: 300 },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
BomLineSchema.index({ bomId: 1, level: 1, sortOrder: 1 });
BomLineSchema.index({ bomId: 1, componentId: 1 });
BomLineSchema.index({ componentId: 1 }); // for where-used queries
BomLineSchema.index({ parentLineId: 1 });
BomLineSchema.index({ bomId: 1, isDeleted: 1 });
exports.BomLine = mongoose_1.default.model("BomLine", BomLineSchema);
