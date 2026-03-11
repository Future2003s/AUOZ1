import mongoose, { Document, Schema } from "mongoose";

export type GRStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface IGoodsReceiptLine extends Document {
    grId: mongoose.Types.ObjectId;
    poLineId: mongoose.Types.ObjectId;
    itemId: mongoose.Types.ObjectId;
    qtyReceived: number;
    /** Cannot exceed PO line qty - qty already received */
    qtyAccepted: number;
    qtyRejected: number;
    uomId: mongoose.Types.ObjectId;
    locationId: mongoose.Types.ObjectId;
    lotId?: mongoose.Types.ObjectId;
    unitCostCents: number;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IGoodsReceipt extends Document {
    grNo: string;
    poId: mongoose.Types.ObjectId;
    vendorId: mongoose.Types.ObjectId;
    status: GRStatus;
    receivedDate: Date;
    receivedBy: mongoose.Types.ObjectId;
    note?: string;
    /** Written when status moves to CONFIRMED */
    confirmedAt?: Date;
    confirmedBy?: mongoose.Types.ObjectId;
    isDeleted: boolean;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const GoodsReceiptLineSchema = new Schema<IGoodsReceiptLine>(
    {
        grId: { type: Schema.Types.ObjectId, ref: "GoodsReceipt", required: true },
        poLineId: { type: Schema.Types.ObjectId, ref: "PurchaseOrderLine", required: true },
        itemId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true },
        qtyReceived: { type: Number, required: true, min: 0 },
        qtyAccepted: { type: Number, required: true, min: 0 },
        qtyRejected: { type: Number, required: true, default: 0, min: 0 },
        uomId: { type: Schema.Types.ObjectId, ref: "UnitOfMeasure", required: true },
        locationId: { type: Schema.Types.ObjectId, ref: "WarehouseLocation", required: true },
        lotId: { type: Schema.Types.ObjectId, ref: "LotNumber", default: null },
        unitCostCents: { type: Number, required: true, min: 0 },
        note: { type: String, trim: true, maxlength: 300 },
    },
    { timestamps: true }
);

GoodsReceiptLineSchema.index({ grId: 1 });
GoodsReceiptLineSchema.index({ poLineId: 1 });
GoodsReceiptLineSchema.index({ itemId: 1 });

const GoodsReceiptSchema = new Schema<IGoodsReceipt>(
    {
        grNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
        poId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
        vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
        status: {
            type: String,
            enum: ["DRAFT", "CONFIRMED", "CANCELLED"],
            default: "DRAFT",
        },
        receivedDate: { type: Date, required: true, default: Date.now },
        receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        note: { type: String, trim: true, maxlength: 1000 },
        confirmedAt: { type: Date, default: null },
        confirmedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

GoodsReceiptSchema.index({ grNo: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
GoodsReceiptSchema.index({ poId: 1 });
GoodsReceiptSchema.index({ vendorId: 1, status: 1 });
GoodsReceiptSchema.index({ receivedDate: -1 });
GoodsReceiptSchema.index({ isDeleted: 1, status: 1 });

export const GoodsReceiptLine = mongoose.model<IGoodsReceiptLine>(
    "GoodsReceiptLine",
    GoodsReceiptLineSchema
);

export const GoodsReceipt = mongoose.model<IGoodsReceipt>("GoodsReceipt", GoodsReceiptSchema);
