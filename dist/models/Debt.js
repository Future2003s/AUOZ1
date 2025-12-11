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
exports.Debt = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DebtItemSchema = new mongoose_1.Schema({
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const DebtHistorySchema = new mongoose_1.Schema({
    action: {
        type: String,
        enum: ["created", "updated", "paid", "marked_overdue", "note_added"],
        required: true
    },
    amount: Number,
    previousAmount: Number,
    note: String,
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});
const DebtSchema = new mongoose_1.Schema({
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
DebtSchema.index({ customer: 1 });
DebtSchema.index({ status: 1 });
DebtSchema.index({ dueDate: 1 });
DebtSchema.index({ createdAt: -1 });
DebtSchema.index({ "items.order": 1 });
// Methods
DebtSchema.methods.calculateTotals = function () {
    this.totalAmount = this.items.reduce((total, item) => {
        return total + (item.status === "paid" ? 0 : item.amount);
    }, 0);
    this.paidAmount = this.items.reduce((total, item) => {
        return total + (item.status === "paid" ? item.amount : 0);
    }, 0);
    this.remainingAmount = this.totalAmount - this.paidAmount;
};
DebtSchema.methods.updateStatus = function () {
    const now = new Date();
    // Check if any items are overdue
    const hasOverdue = this.items.some((item) => item.status === "pending" && new Date(item.dueDate) < now);
    if (hasOverdue) {
        this.status = "overdue";
        // Mark overdue items
        this.items.forEach((item) => {
            if (item.status === "pending" && new Date(item.dueDate) < now) {
                item.status = "overdue";
            }
        });
    }
    else if (this.remainingAmount === 0 && this.paidAmount > 0) {
        this.status = "paid";
    }
    else if (this.paidAmount > 0 && this.remainingAmount > 0) {
        this.status = "partial";
    }
    else {
        this.status = "pending";
    }
};
DebtSchema.methods.addHistory = function (action, updatedBy, note, amount) {
    const historyEntry = {
        action: action,
        note,
        amount,
        updatedBy: new mongoose_1.default.Types.ObjectId(updatedBy),
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
        const earliestDue = this.items.reduce((earliest, item) => {
            const itemDue = new Date(item.dueDate);
            if (!earliest)
                return itemDue;
            return itemDue < earliest ? itemDue : earliest;
        }, null);
        if (earliestDue) {
            this.dueDate = earliestDue;
        }
    }
    next();
});
exports.Debt = mongoose_1.default.model("Debt", DebtSchema);
