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
exports.Advertisement = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AdvertisementSchema = new mongoose_1.Schema({
    enabled: {
        type: Boolean,
        default: true
    },
    title: {
        type: String,
        trim: true
    },
    content: {
        type: String,
        required: [true, 'Nội dung quảng cáo là bắt buộc'],
        trim: true
    },
    imageUrl: {
        type: String,
        trim: true
    },
    link: {
        type: String,
        trim: true
    },
    linkText: {
        type: String,
        default: 'Xem thêm',
        trim: true
    },
    delayTime: {
        type: Number,
        default: 0,
        min: 0
    },
    width: {
        type: String,
        default: 'auto'
    },
    height: {
        type: String,
        default: 'auto'
    },
    maxWidth: {
        type: String,
        default: '90vw'
    },
    maxHeight: {
        type: String,
        default: '90vh'
    },
    position: {
        type: String,
        enum: ['center', 'top', 'bottom', 'left', 'right'],
        default: 'center'
    },
    showCloseButton: {
        type: Boolean,
        default: true
    },
    closeOnClickOutside: {
        type: Boolean,
        default: true
    },
    closeOnEscape: {
        type: Boolean,
        default: true
    },
    autoCloseTime: {
        type: Number,
        default: 0,
        min: 0
    },
    priority: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    targetAudience: {
        roles: [{
                type: String
            }],
        locales: [{
                type: String
            }]
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
AdvertisementSchema.index({ enabled: 1, priority: -1 });
AdvertisementSchema.index({ startDate: 1, endDate: 1 });
AdvertisementSchema.index({ createdAt: -1 });
// Virtual để kiểm tra quảng cáo có đang active không
AdvertisementSchema.virtual('isActive').get(function () {
    if (!this.enabled)
        return false;
    const now = new Date();
    if (this.startDate && now < this.startDate)
        return false;
    if (this.endDate && now > this.endDate)
        return false;
    return true;
});
exports.Advertisement = mongoose_1.default.model('Advertisement', AdvertisementSchema);
