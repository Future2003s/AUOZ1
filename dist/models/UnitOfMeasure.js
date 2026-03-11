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
exports.UnitOfMeasure = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UomConversionSchema = new mongoose_1.Schema({
    toUomId: { type: mongoose_1.Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
    factor: { type: Number, required: true, min: 0 },
}, { _id: false });
const UnitOfMeasureSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: [true, "UOM code is required"],
        trim: true,
        uppercase: true,
        maxlength: [10, "Code must be ≤ 10 characters"],
    },
    name: {
        type: String,
        required: [true, "UOM name is required"],
        trim: true,
        maxlength: [50, "Name must be ≤ 50 characters"],
    },
    type: {
        type: String,
        required: true,
        enum: ["quantity", "weight", "volume", "length", "area", "time", "other"],
        default: "quantity",
    },
    conversions: { type: [UomConversionSchema], default: [] },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
UnitOfMeasureSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
UnitOfMeasureSchema.index({ isDeleted: 1, isActive: 1 });
exports.UnitOfMeasure = mongoose_1.default.model("UnitOfMeasure", UnitOfMeasureSchema);
