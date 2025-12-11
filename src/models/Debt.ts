import mongoose, { Document, Schema } from "mongoose";

export interface IDebtItem {
    order: mongoose.Types.ObjectId;
    orderNumber: string;
    amount: number;
    description?: string;
    status: "pending" | "paid" | "overdue";
    dueDate: Date;
    paidAt?: Date;
    paymentProof?: string; // URL to proof image
}

export interface IDebtHistory {
    action: "created" | "updated" | "paid" | "marked_overdue" | "note_added";
    amount?: number;
    previousAmount?: number;
    note?: string;
    updatedBy: mongoose.Types.ObjectId;
    updatedAt: Date;
}

export interface IDebt extends Document {
    customer: mongoose.Types.ObjectId;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    
    // Debt items
    items: IDebtItem[];
    
    // Totals
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    
    // Status
    status: "pending" | "partial" | "paid" | "overdue";
    
    // Dates
    dueDate: Date;
    createdAt: Date;
    updatedAt: Date;
    
    // History
    history: IDebtHistory[];
    
    // Notes
    notes?: string;
    
    // Methods
    calculateTotals(): void;
    updateStatus(): void;
    addHistory(action: string, updatedBy: string, note?: string, amount?: number): void;
}

const DebtItemSchema = new Schema<IDebtItem>({
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
        min: [0, "Amount cannot be negative"]
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ["pending", "paid", "overdue"],
        default: "pending"
    },
    dueDate: {
        type: Date,
        required: true
    },
    paidAt: Date,
    paymentProof: String
});

const DebtHistorySchema = new Schema<IDebtHistory>({
    action: {
        type: String,
        enum: ["created", "updated", "paid", "marked_overdue", "note_added"],
        required: true
    },
    amount: Number,
    previousAmount: Number,
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

const DebtSchema = new Schema<IDebt>(
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
        items: [DebtItemSchema],
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        paidAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        remainingAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        status: {
            type: String,
            enum: ["pending", "partial", "paid", "overdue"],
            default: "pending"
        },
        dueDate: {
            type: Date,
            required: true
        },
        history: [DebtHistorySchema],
        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
DebtSchema.index({ customer: 1 });
DebtSchema.index({ status: 1 });
DebtSchema.index({ dueDate: 1 });
DebtSchema.index({ createdAt: -1 });
DebtSchema.index({ "items.order": 1 });

// Methods
DebtSchema.methods.calculateTotals = function (): void {
    this.totalAmount = this.items.reduce((total: number, item: IDebtItem) => {
        return total + (item.status === "paid" ? 0 : item.amount);
    }, 0);
    
    this.paidAmount = this.items.reduce((total: number, item: IDebtItem) => {
        return total + (item.status === "paid" ? item.amount : 0);
    }, 0);
    
    this.remainingAmount = this.totalAmount - this.paidAmount;
};

DebtSchema.methods.updateStatus = function (): void {
    const now = new Date();
    
    // Check if any items are overdue
    const hasOverdue = this.items.some((item: IDebtItem) => 
        item.status === "pending" && new Date(item.dueDate) < now
    );
    
    if (hasOverdue) {
        this.status = "overdue";
        // Mark overdue items
        this.items.forEach((item: IDebtItem) => {
            if (item.status === "pending" && new Date(item.dueDate) < now) {
                item.status = "overdue";
            }
        });
    } else if (this.remainingAmount === 0 && this.paidAmount > 0) {
        this.status = "paid";
    } else if (this.paidAmount > 0 && this.remainingAmount > 0) {
        this.status = "partial";
    } else {
        this.status = "pending";
    }
};

DebtSchema.methods.addHistory = function (
    action: string,
    updatedBy: string,
    note?: string,
    amount?: number
): void {
    const historyEntry: IDebtHistory = {
        action: action as any,
        note,
        amount,
        updatedBy: new mongoose.Types.ObjectId(updatedBy),
        updatedAt: new Date()
    };
    this.history.push(historyEntry);
};

// Pre-save middleware
DebtSchema.pre("save", function (next) {
    this.calculateTotals();
    this.updateStatus();
    
    // Set dueDate to the earliest due date of items if not set
    if (this.items.length > 0 && !this.dueDate) {
        const earliestDue = this.items.reduce<Date | null>((earliest, item: IDebtItem) => {
            const itemDue = new Date(item.dueDate);
            if (!earliest) return itemDue;
            return itemDue < earliest ? itemDue : earliest;
        }, null);
        
        if (earliestDue) {
            this.dueDate = earliestDue;
        }
    }
    
    next();
});

export const Debt = mongoose.model<IDebt>("Debt", DebtSchema);

