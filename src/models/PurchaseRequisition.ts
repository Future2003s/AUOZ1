import mongoose, { Document, Schema } from "mongoose";

export type PRStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "CONVERTED";

export interface IPurchaseRequisitionLine {
    itemId: mongoose.Types.ObjectId;
    description?: string;
    qty: number;
    uomId: mongoose.Types.ObjectId;
    /** Estimated unit price in cents */
    estimatedPriceCents: number;
    neededBy?: Date;
    note?: string;
}

export interface IPurchaseRequisition extends Document {
    prNo: string;
    status: PRStatus;
    requestedBy: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectionReason?: string;
    neededBy?: Date;
    note?: string;
    lines: IPurchaseRequisitionLine[];
    /** Total estimated value in cents */
    totalEstimatedCents: number;
    isDeleted: boolean;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PRLineSchema = new Schema<IPurchaseRequisitionLine>(
    {
        itemId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true },
        description: { type: String, trim: true, maxlength: 200 },
        qty: { type: Number, required: true, min: 0.0001 },
        uomId: { type: Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
        estimatedPriceCents: { type: Number, required: true, min: 0, default: 0 },
        neededBy: { type: Date, default: null },
        note: { type: String, trim: true, maxlength: 300 },
    },
    { _id: true }
);

const PurchaseRequisitionSchema = new Schema<IPurchaseRequisition>(
    {
        prNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
        status: {
            type: String,
            enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED", "CONVERTED"],
            default: "DRAFT",
        },
        requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        approvedAt: { type: Date, default: null },
        rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        rejectionReason: { type: String, trim: true, maxlength: 500 },
        neededBy: { type: Date, default: null },
        note: { type: String, trim: true, maxlength: 1000 },
        lines: {
            type: [PRLineSchema],
            required: true,
            validate: {
                validator: (lines: IPurchaseRequisitionLine[]) => lines.length > 0,
                message: "Purchase Requisition must have at least one line item",
            },
        },
        totalEstimatedCents: { type: Number, default: 0, min: 0 },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

PurchaseRequisitionSchema.index({ prNo: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
PurchaseRequisitionSchema.index({ status: 1, createdAt: -1 });
PurchaseRequisitionSchema.index({ requestedBy: 1 });
PurchaseRequisitionSchema.index({ isDeleted: 1, status: 1 });

export const PurchaseRequisition = mongoose.model<IPurchaseRequisition>(
    "PurchaseRequisition",
    PurchaseRequisitionSchema
);
