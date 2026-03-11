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
exports.Vendor = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VendorSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: [true, "Vendor code is required"],
        trim: true,
        uppercase: true,
        maxlength: 20,
    },
    name: {
        type: String,
        required: [true, "Vendor name is required"],
        trim: true,
        maxlength: 200,
    },
    contactName: { type: String, trim: true, maxlength: 100 },
    contactPhone: { type: String, trim: true, maxlength: 20 },
    contactEmail: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 100,
        match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    address: { type: String, trim: true, maxlength: 300 },
    taxId: { type: String, trim: true, maxlength: 20 },
    currency: { type: String, trim: true, uppercase: true, default: "VND", maxlength: 3 },
    paymentTermsDays: { type: Number, default: 30, min: 0 },
    creditLimitCents: { type: Number, default: 0, min: 0 },
    outstandingCents: { type: Number, default: 0, min: 0 },
    rating: { type: Number, min: 1, max: 5, default: null },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
VendorSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
VendorSchema.index({ name: "text" });
VendorSchema.index({ isDeleted: 1, isActive: 1 });
exports.Vendor = mongoose_1.default.model("Vendor", VendorSchema);
