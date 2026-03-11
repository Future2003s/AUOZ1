import mongoose, { Document, Schema } from "mongoose";

export type POStatus =
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "SENT"
    | "PARTIAL"
    | "RECEIVED"
    | "CANCELLED";

export interface IPurchaseOrderLine extends Document {
    poId: mongoose.Types.ObjectId;
    prLineRef?: mongoose.Types.ObjectId;   // trace back to PR line
    itemId: mongoose.Types.ObjectId;
    description?: string;
    qty: number;
    unitPriceCents: number;               // agreed unit price in cents
    uomId: mongoose.Types.ObjectId;
    promisedDate?: Date;
    qtyReceived: number;                  // updated on each GR
    lineTotalCents: number;               // qty × unitPriceCents
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPurchaseOrder extends Document {
    poNo: string;
    prId?: mongoose.Types.ObjectId;       // source PR (optional)
    vendorId: mongoose.Types.ObjectId;
    status: POStatus;
    currency: string;
    paymentTermsDays: number;
    expectedDeliveryDate?: Date;
    note?: string;
    totalAmountCents: number;             // sum of all line totals
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    sentAt?: Date;
    isDeleted: boolean;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PurchaseOrderLineSchema = new Schema<IPurchaseOrderLine>(
    {
        poId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
        prLineRef: { type: Schema.Types.ObjectId, default: null },
        itemId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true },
        description: { type: String, trim: true, maxlength: 200 },
        qty: { type: Number, required: true, min: 0.0001 },
        unitPriceCents: { type: Number, required: true, min: 0 },
        uomId: { type: Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
        promisedDate: { type: Date, default: null },
        qtyReceived: { type: Number, default: 0, min: 0 },
        lineTotalCents: { type: Number, required: true, min: 0 },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

PurchaseOrderLineSchema.index({ poId: 1 });
PurchaseOrderLineSchema.index({ itemId: 1 });

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
    {
        poNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
        prId: { type: Schema.Types.ObjectId, ref: "PurchaseRequisition", default: null },
        vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
        status: {
            type: String,
            enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "PARTIAL", "RECEIVED", "CANCELLED"],
            default: "DRAFT",
        },
        currency: { type: String, trim: true, uppercase: true, default: "VND", maxlength: 3 },
        paymentTermsDays: { type: Number, default: 30, min: 0 },
        expectedDeliveryDate: { type: Date, default: null },
        note: { type: String, trim: true, maxlength: 1000 },
        totalAmountCents: { type: Number, default: 0, min: 0 },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        approvedAt: { type: Date, default: null },
        sentAt: { type: Date, default: null },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

PurchaseOrderSchema.index({ poNo: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
PurchaseOrderSchema.index({ vendorId: 1, status: 1 });
PurchaseOrderSchema.index({ status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ prId: 1 });
PurchaseOrderSchema.index({ isDeleted: 1, status: 1 });

export const PurchaseOrderLine = mongoose.model<IPurchaseOrderLine>(
    "PurchaseOrderLine",
    PurchaseOrderLineSchema
);

export const PurchaseOrder = mongoose.model<IPurchaseOrder>(
    "PurchaseOrder",
    PurchaseOrderSchema
);
