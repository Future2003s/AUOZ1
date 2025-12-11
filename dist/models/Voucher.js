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
exports.Voucher = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VoucherUsageSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    count: {
        type: Number,
        default: 0,
        min: 0
    },
    lastUsedAt: Date
}, { _id: false });
const VoucherSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 32
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    description: {
        type: String,
        maxlength: 512
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "fixed"
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0,
        max: 100000000 // 100M VND safety
    },
    maxDiscountValue: {
        type: Number,
        min: 0
    },
    minOrderValue: {
        type: Number,
        default: 0,
        min: 0
    },
    startDate: Date,
    endDate: Date,
    usageLimit: {
        type: Number,
        min: 1
    },
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    perUserLimit: {
        type: Number,
        min: 1
    },
    userUsage: {
        type: [VoucherUsageSchema],
        default: []
    },
    autoApply: {
        type: Boolean,
        default: false
    },
    tags: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ["draft", "scheduled", "active", "expired", "disabled"],
        default: "draft"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUsedAt: Date,
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
});
VoucherSchema.index({ code: 1 }, { unique: true });
VoucherSchema.index({ status: 1, isActive: 1 });
VoucherSchema.index({ startDate: 1, endDate: 1 });
VoucherSchema.index({ usageCount: 1 });
exports.Voucher = mongoose_1.default.model("Voucher", VoucherSchema);
