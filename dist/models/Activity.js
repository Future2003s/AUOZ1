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
exports.Activity = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ActivitySchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Tiêu đề hoạt động là bắt buộc'],
        trim: true,
        maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: [500, 'Mô tả ngắn không được vượt quá 500 ký tự']
    },
    content: {
        type: String,
        required: [true, 'Nội dung hoạt động là bắt buộc'],
        trim: true
    },
    imageUrl: {
        type: String,
        trim: true
    },
    gallery: [{
            type: String,
            trim: true
        }],
    activityDate: {
        type: Date
    },
    location: {
        type: String,
        trim: true,
        maxlength: [200, 'Địa điểm không được vượt quá 200 ký tự']
    },
    published: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    },
    tags: [{
            type: String,
            trim: true
        }],
    seo: {
        title: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        keywords: [{
                type: String,
                trim: true
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
ActivitySchema.index({ published: 1, order: -1, createdAt: -1 });
ActivitySchema.index({ activityDate: -1 });
ActivitySchema.index({ tags: 1 });
ActivitySchema.index({ title: 'text', shortDescription: 'text', content: 'text' });
exports.Activity = mongoose_1.default.model('Activity', ActivitySchema);
