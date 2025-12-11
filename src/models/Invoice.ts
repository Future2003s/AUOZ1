import mongoose, { Document, Schema } from "mongoose";

export interface IInvoiceReminder {
    customer: mongoose.Types.ObjectId;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    
    // Order information
    orders: Array<{
        order: mongoose.Types.ObjectId;
        orderNumber: string;
        amount: number;
        orderDate: Date;
    }>;
    
    // Invoice details
    invoiceNumber?: string;
    invoiceDate?: Date;
    invoiceFile?: string; // URL to invoice PDF/image
    invoiceVAT?: string; // URL to VAT invoice
    
    // Status
    status: "pending" | "reminded" | "issued" | "overdue";
    
    // Deadlines
    deadline: Date;
    remindedAt?: Date;
    issuedAt?: Date;
    
    // Notes
    notes?: string;
    
    // Tracking
    createdAt: Date;
    updatedAt: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
}

export interface IInvoiceReminderHistory {
    action: "created" | "reminded" | "issued" | "updated" | "note_added";
    invoiceNumber?: string;
    note?: string;
    updatedBy: mongoose.Types.ObjectId;
    updatedAt: Date;
}

export interface IInvoice extends Document {
    customer: mongoose.Types.ObjectId;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    
    // Order information
    orders: Array<{
        order: mongoose.Types.ObjectId;
        orderNumber: string;
        amount: number;
        orderDate: Date;
    }>;
    
    // Invoice details
    invoiceNumber: string;
    invoiceDate: Date;
    invoiceFile?: string; // URL to invoice PDF/image
    invoiceVAT?: string; // URL to VAT invoice
    
    // Status
    status: "pending" | "reminded" | "issued" | "overdue";
    
    // Deadlines
    deadline: Date;
    remindedAt?: Date;
    issuedAt?: Date;
    
    // Totals
    totalAmount: number;
    
    // Notes
    notes?: string;
    
    // History
    history: IInvoiceReminderHistory[];
    
    // Tracking
    createdAt: Date;
    updatedAt: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    
    // Methods
    calculateTotal(): void;
    updateStatus(): void;
    addHistory(action: string, updatedBy: string, note?: string, invoiceNumber?: string): void;
}

const OrderInfoSchema = new Schema({
    order: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    orderNumber: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    orderDate: {
        type: Date,
        required: true
    }
});

const InvoiceHistorySchema = new Schema<IInvoiceReminderHistory>({
    action: {
        type: String,
        enum: ["created", "reminded", "issued", "updated", "note_added"],
        required: true
    },
    invoiceNumber: String,
    note: String,
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const InvoiceSchema = new Schema<IInvoice>(
    {
        customer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        customerName: {
            type: String,
            required: true,
            trim: true
        },
        customerPhone: {
            type: String,
            trim: true
        },
        customerEmail: {
            type: String,
            trim: true,
            lowercase: true
        },
        orders: [OrderInfoSchema],
        invoiceNumber: {
            type: String,
            trim: true,
            uppercase: true
        },
        invoiceDate: Date,
        invoiceFile: String,
        invoiceVAT: String,
        status: {
            type: String,
            enum: ["pending", "reminded", "issued", "overdue"],
            default: "pending"
        },
        deadline: {
            type: Date,
            required: true
        },
        remindedAt: Date,
        issuedAt: Date,
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        history: [InvoiceHistorySchema],
        notes: {
            type: String,
            trim: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
InvoiceSchema.index({ customer: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ deadline: 1 });
InvoiceSchema.index({ createdAt: -1 });
InvoiceSchema.index({ invoiceNumber: 1 }, { sparse: true });
InvoiceSchema.index({ "orders.order": 1 });

// Methods
InvoiceSchema.methods.calculateTotal = function (): void {
    this.totalAmount = this.orders.reduce((total: number, orderInfo: any) => {
        return total + orderInfo.amount;
    }, 0);
};

InvoiceSchema.methods.updateStatus = function (): void {
    const now = new Date();
    
    if (this.status === "issued") {
        return; // Don't change status if already issued
    }
    
    if (this.invoiceNumber && this.invoiceDate) {
        this.status = "issued";
        this.issuedAt = this.issuedAt || new Date();
    } else if (new Date(this.deadline) < now) {
        this.status = "overdue";
    } else if (this.remindedAt) {
        this.status = "reminded";
    } else {
        this.status = "pending";
    }
};

InvoiceSchema.methods.addHistory = function (
    action: string,
    updatedBy: string,
    note?: string,
    invoiceNumber?: string
): void {
    const historyEntry: IInvoiceReminderHistory = {
        action: action as any,
        note,
        invoiceNumber,
        updatedBy: new mongoose.Types.ObjectId(updatedBy),
        updatedAt: new Date()
    };
    this.history.push(historyEntry);
};

// Pre-save middleware
InvoiceSchema.pre("save", function (next) {
    this.calculateTotal();
    this.updateStatus();
    next();
});

// Pre-save middleware to generate invoice number
InvoiceSchema.pre("save", function (next) {
    if (this.isNew && !this.invoiceNumber) {
        // Will be set when invoice is issued
        next();
        return;
    }
    next();
});

export const Invoice = mongoose.model<IInvoice>("Invoice", InvoiceSchema);

