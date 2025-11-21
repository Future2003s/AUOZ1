import mongoose, { Document, Schema } from "mongoose";

export interface IOrderItem {
    product?: mongoose.Types.ObjectId; // Optional for custom items
    name: string; // Product name at time of order
    sku: string;
    quantity: number;
    price: number; // Price at time of order
    variant?: {
        name: string;
        value: string;
    }[];
    image?: string; // Main product image
}

export interface IShippingAddress {
    firstName: string;
    lastName: string;
    company?: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
}

export interface IPaymentInfo {
    method: "credit_card" | "paypal" | "bank_transfer" | "cash_on_delivery";
    status: "pending" | "processing" | "completed" | "failed" | "refunded";
    transactionId?: string;
    paymentGateway?: string;
    paidAt?: Date;
    refundedAt?: Date;
    refundAmount?: number;
}

export interface IOrderTracking {
    status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
    updatedAt: Date;
    note?: string;
    updatedBy?: mongoose.Types.ObjectId;
}

export interface IOrder extends Document {
    orderNumber: string;
    user?: mongoose.Types.ObjectId; // Optional for guest orders

    // Order items
    items: IOrderItem[];

    // Pricing
    subtotal: number;
    tax: number;
    taxRate: number;
    shippingCost: number;
    discount: number;
    discountCode?: string;
    total: number;
    currency: string;

    // Addresses
    shippingAddress: IShippingAddress;
    billingAddress?: IShippingAddress;

    // Payment
    payment: IPaymentInfo;

    // Shipping
    shippingMethod?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    deliveredAt?: Date;

    // Status and tracking
    status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
    statusHistory: IOrderTracking[];

    // Notes
    customerNotes?: string;
    adminNotes?: string;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;

    // Virtual fields
    totalItems: number;
    canCancel: boolean;
    canReturn: boolean;

    // Methods
    updateStatus(status: string, note?: string, updatedBy?: string): Promise<IOrder>;
    calculateTotals(): void;
}

const OrderItemSchema = new Schema<IOrderItem>({
    product: {
        type: Schema.Types.ObjectId,
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

const ShippingAddressSchema = new Schema<IShippingAddress>({
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

const PaymentInfoSchema = new Schema<IPaymentInfo>({
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

const OrderTrackingSchema = new Schema<IOrderTracking>({
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
        type: Schema.Types.ObjectId,
        ref: "User"
    }
});

const OrderSchema = new Schema<IOrder>(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true
        },
        user: {
            type: Schema.Types.ObjectId,
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
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual for total items
OrderSchema.virtual("totalItems").get(function () {
    return this.items.reduce((total: number, item: IOrderItem) => total + item.quantity, 0);
});

// Virtual for can cancel
OrderSchema.virtual("canCancel").get(function () {
    return ["pending", "confirmed"].includes(this.status);
});

// Virtual for can return
OrderSchema.virtual("canReturn").get(function () {
    const deliveredDate = this.deliveredAt;
    if (!deliveredDate || this.status !== "delivered") return false;

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
OrderSchema.methods.updateStatus = async function (status: string, note?: string, updatedBy?: string): Promise<IOrder> {
    this.status = status;

    // Add to status history
    this.statusHistory.push({
        status,
        updatedAt: new Date(),
        note,
        updatedBy: updatedBy ? new mongoose.Types.ObjectId(updatedBy) : undefined
    } as IOrderTracking);

    // Set specific timestamps
    if (status === "delivered") {
        this.deliveredAt = new Date();
    }

    return this.save();
};

OrderSchema.methods.calculateTotals = function (): void {
    this.subtotal = this.items.reduce((total: number, item: IOrderItem) => total + item.price * item.quantity, 0);

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
            } as IOrderTracking
        ];
    }
    next();
});

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
