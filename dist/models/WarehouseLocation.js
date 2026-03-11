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
exports.WarehouseLocation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const WarehouseLocationSchema = new mongoose_1.Schema({
    warehouseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: [true, "Warehouse is required"],
    },
    code: {
        type: String,
        required: [true, "Location code is required"],
        trim: true,
        uppercase: true,
        maxlength: [30, "Code must be ≤ 30 characters"],
    },
    name: {
        type: String,
        required: [true, "Location name is required"],
        trim: true,
        maxlength: [100, "Name must be ≤ 100 characters"],
    },
    zone: { type: String, trim: true, maxlength: 20 },
    aisle: { type: String, trim: true, maxlength: 10 },
    rack: { type: String, trim: true, maxlength: 10 },
    shelf: { type: String, trim: true, maxlength: 10 },
    bin: { type: String, trim: true, maxlength: 10 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
WarehouseLocationSchema.index({ warehouseId: 1, code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
WarehouseLocationSchema.index({ warehouseId: 1, isDeleted: 1 });
WarehouseLocationSchema.index({ isDeleted: 1, isActive: 1 });
exports.WarehouseLocation = mongoose_1.default.model("WarehouseLocation", WarehouseLocationSchema);
