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
exports.Order = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const OrderItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: false // Optional for custom items
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    sku: {
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
    variant: [
        {
            name: { type: String, required: true },
            value: { type: String, required: true }
        }
    ],
    image: String
});
const ShippingAddressSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    phone: { type: String, trim: true }
});
const PaymentInfoSchema = new mongoose_1.Schema({
    method: {
        type: String,
        enum: ["credit_card", "paypal", "bank_transfer", "cash_on_delivery"],
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "refunded"],
        default: "pending"
    },
    transactionId: String,
    paymentGateway: String,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: {
        type: Number,
        min: 0
    }
});
const OrderTrackingSchema = new mongoose_1.Schema({
    status: {
        type: String,
        enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"],
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    note: String,
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User"
    }
});
const OrderSchema = new mongoose_1.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false // Allow null for guest orders
    },
    items: [OrderItemSchema],
    // Pricing
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    },
    shippingCost: {
        type: Number,
        default: 0,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    discountCode: String,
    total: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: "USD",
        uppercase: true
    },
    // Addresses
    shippingAddress: {
        type: ShippingAddressSchema,
        required: true
    },
    billingAddress: ShippingAddressSchema,
    // Payment
    payment: {
        type: PaymentInfoSchema,
        required: true
    },
    // Shipping
    shippingMethod: String,
    trackingNumber: String,
    estimatedDelivery: Date,
    deliveredAt: Date,
    // Status
    status: {
        type: String,
        enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"],
        default: "pending"
    },
    statusHistory: [OrderTrackingSchema],
    // Notes
    customerNotes: String,
    adminNotes: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Virtual for total items
OrderSchema.virtual("totalItems").get(function () {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});
// Virtual for can cancel
OrderSchema.virtual("canCancel").get(function () {
    return ["pending", "confirmed"].includes(this.status);
});
// Virtual for can return
OrderSchema.virtual("canReturn").get(function () {
    const deliveredDate = this.deliveredAt;
    if (!deliveredDate || this.status !== "delivered")
        return false;
    // Allow returns within 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return deliveredDate > thirtyDaysAgo;
});
// Indexes
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ user: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ "payment.status": 1 });
// Methods
OrderSchema.methods.updateStatus = async function (status, note, updatedBy) {
    this.status = status;
    // Add to status history
    this.statusHistory.push({
        status,
        updatedAt: new Date(),
        note,
        updatedBy: updatedBy ? new mongoose_1.default.Types.ObjectId(updatedBy) : undefined
    });
    // Set specific timestamps
    if (status === "delivered") {
        this.deliveredAt = new Date();
    }
    return this.save();
};
OrderSchema.methods.calculateTotals = function () {
    this.subtotal = this.items.reduce((total, item) => total + item.price * item.quantity, 0);
    this.tax = this.subtotal * this.taxRate;
    this.total = this.subtotal + this.tax + this.shippingCost - this.discount;
};
// Pre-save middleware to calculate totals
OrderSchema.pre("save", function (next) {
    this.calculateTotals();
    next();
});
// Pre-save middleware to generate order number
OrderSchema.pre("save", function (next) {
    if (this.isNew && !this.orderNumber) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        this.orderNumber = `ORD-${timestamp}-${random}`;
    }
    next();
});
// Pre-save middleware to initialize status history
OrderSchema.pre("save", function (next) {
    if (this.isNew) {
        this.statusHistory = [
            {
                status: this.status,
                updatedAt: new Date()
            }
        ];
    }
    next();
});
exports.Order = mongoose_1.default.model("Order", OrderSchema);
