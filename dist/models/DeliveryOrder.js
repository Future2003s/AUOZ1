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
exports.DeliveryOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DeliveryItemSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, "Quantity must be at least 1"]
    },
    price: {
        type: Number,
        required: true,
        min: [0, "Price cannot be negative"]
    },
    total: {
        type: Number,
        required: true,
        min: [0, "Total cannot be negative"]
    },
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product"
    }
});
const DeliveryOrderSchema = new mongoose_1.Schema({
    orderCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    buyerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Buyer"
    },
    buyerName: {
        type: String,
        required: false, // Optional for draft orders, will be validated in controller
        trim: true,
        default: ""
    },
    deliveryDate: {
        type: Date,
        required: true
    },
    items: [DeliveryItemSchema],
    amount: {
        type: Number,
        required: true,
        min: [0, "Amount cannot be negative"]
    },
    isInvoice: {
        type: Boolean,
        default: false
    },
    isDebt: {
        type: Boolean,
        default: false
    },
    isShipped: {
        type: Boolean,
        default: false
    },
    proofImage: {
        type: String,
        trim: true
    },
    note: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ["draft", "completed", "cancelled"],
        default: "draft"
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
DeliveryOrderSchema.index({ orderCode: 1 }, { unique: true });
DeliveryOrderSchema.index({ buyerName: 1 });
DeliveryOrderSchema.index({ deliveryDate: 1 });
DeliveryOrderSchema.index({ createdAt: -1 });
DeliveryOrderSchema.index({ createdBy: 1 });
DeliveryOrderSchema.index({ isShipped: 1 });
// Pre-save middleware to calculate amount
DeliveryOrderSchema.pre("save", function (next) {
    if (this.items && this.items.length > 0) {
        this.amount = this.items.reduce((total, item) => {
            return total + (item.total || item.quantity * item.price);
        }, 0);
    }
    next();
});
exports.DeliveryOrder = mongoose_1.default.model("DeliveryOrder", DeliveryOrderSchema);
