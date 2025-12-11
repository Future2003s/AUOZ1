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
exports.Invoice = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const OrderInfoSchema = new mongoose_1.Schema({
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
        min: 0
    },
    orderDate: {
        type: Date,
        required: true
    }
});
const InvoiceHistorySchema = new mongoose_1.Schema({
    action: {
        type: String,
        enum: ["created", "reminded", "issued", "updated", "note_added"],
        required: true
    },
    invoiceNumber: String,
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
const InvoiceSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
InvoiceSchema.index({ customer: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ deadline: 1 });
InvoiceSchema.index({ createdAt: -1 });
InvoiceSchema.index({ invoiceNumber: 1 }, { sparse: true });
InvoiceSchema.index({ "orders.order": 1 });
// Methods
InvoiceSchema.methods.calculateTotal = function () {
    this.totalAmount = this.orders.reduce((total, orderInfo) => {
        return total + orderInfo.amount;
    }, 0);
};
InvoiceSchema.methods.updateStatus = function () {
    const now = new Date();
    if (this.status === "issued") {
        return; // Don't change status if already issued
    }
    if (this.invoiceNumber && this.invoiceDate) {
        this.status = "issued";
        this.issuedAt = this.issuedAt || new Date();
    }
    else if (new Date(this.deadline) < now) {
        this.status = "overdue";
    }
    else if (this.remindedAt) {
        this.status = "reminded";
    }
    else {
        this.status = "pending";
    }
};
InvoiceSchema.methods.addHistory = function (action, updatedBy, note, invoiceNumber) {
    const historyEntry = {
        action: action,
        note,
        invoiceNumber,
        updatedBy: new mongoose_1.default.Types.ObjectId(updatedBy),
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
exports.Invoice = mongoose_1.default.model("Invoice", InvoiceSchema);
