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
exports.Cart = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CartItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    variant: [{
            name: { type: String, required: true },
            value: { type: String, required: true }
        }],
    addedAt: {
        type: Date,
        default: Date.now
    }
});
const CartSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        sparse: true // Allows null values and creates sparse index
    },
    sessionId: {
        type: String,
        sparse: true // For guest carts
    },
    items: [CartItemSchema],
    totalItems: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 } // TTL index for guest carts
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Virtual for checking if cart is empty
CartSchema.virtual('isEmpty').get(function () {
    return this.items.length === 0;
});
// Indexes
CartSchema.index({ user: 1 }, { unique: true, sparse: true });
CartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
CartSchema.index({ isActive: 1 });
CartSchema.index({ updatedAt: -1 });
// Methods
CartSchema.methods.addItem = async function (productId, quantity, price, variant) {
    const existingItemIndex = this.items.findIndex((item) => {
        const sameProduct = item.product.toString() === productId;
        const sameVariant = JSON.stringify(item.variant || []) === JSON.stringify(variant || []);
        return sameProduct && sameVariant;
    });
    if (existingItemIndex > -1) {
        // Update existing item
        this.items[existingItemIndex].quantity += quantity;
        this.items[existingItemIndex].addedAt = new Date();
    }
    else {
        // Add new item
        this.items.push({
            product: new mongoose_1.default.Types.ObjectId(productId),
            quantity,
            price,
            variant,
            addedAt: new Date()
        });
    }
    this.calculateTotals();
    return this.save();
};
CartSchema.methods.updateItem = async function (productId, quantity) {
    const itemIndex = this.items.findIndex((item) => item.product.toString() === productId);
    if (itemIndex === -1) {
        throw new Error('Item not found in cart');
    }
    if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        this.items.splice(itemIndex, 1);
    }
    else {
        this.items[itemIndex].quantity = quantity;
        this.items[itemIndex].addedAt = new Date();
    }
    this.calculateTotals();
    return this.save();
};
CartSchema.methods.removeItem = async function (productId) {
    this.items = this.items.filter((item) => item.product.toString() !== productId);
    this.calculateTotals();
    return this.save();
};
CartSchema.methods.clearCart = async function () {
    this.items = [];
    this.calculateTotals();
    return this.save();
};
CartSchema.methods.calculateTotals = function () {
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
    this.totalPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
};
// Pre-save middleware to calculate totals
CartSchema.pre('save', function (next) {
    this.calculateTotals();
    next();
});
// Pre-save middleware to set expiration for guest carts
CartSchema.pre('save', function (next) {
    if (this.sessionId && !this.user && !this.expiresAt) {
        // Set expiration to 30 days for guest carts
        this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    next();
});
exports.Cart = mongoose_1.default.model('Cart', CartSchema);
