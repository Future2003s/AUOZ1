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
exports.FlowerLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FlowerLogItemSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: [true, 'Item type is required'],
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    }
}, { _id: false });
const FlowerLogSchema = new mongoose_1.Schema({
    cutter: {
        type: String,
        required: [true, 'Cutter name is required'],
        trim: true,
        maxlength: [200, 'Cutter name cannot exceed 200 characters']
    },
    date: {
        type: String,
        required: [true, 'Date is required'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
    },
    items: {
        type: [FlowerLogItemSchema],
        required: [true, 'Items are required'],
        validate: {
            validator: function (items) {
                return items && items.length > 0;
            },
            message: 'At least one item is required'
        }
    },
    history: {
        type: [String],
        default: []
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for better performance
FlowerLogSchema.index({ cutter: 1 });
FlowerLogSchema.index({ date: 1 });
FlowerLogSchema.index({ createdAt: -1 });
FlowerLogSchema.index({ cutter: 'text', 'items.type': 'text' }); // Text search index
// Virtual to convert _id to id (number-like for compatibility with frontend)
FlowerLogSchema.virtual('id').get(function () {
    return this._id.toString();
});
// Ensure virtual fields are serialized
FlowerLogSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        if (ret._id) {
            ret.id = ret._id.toString();
            delete ret._id;
        }
        if (ret.__v !== undefined) {
            delete ret.__v;
        }
        return ret;
    }
});
exports.FlowerLog = mongoose_1.default.model('FlowerLog', FlowerLogSchema);
