import mongoose, { Document, Schema } from "mongoose";

export type DefectiveSeverity = "low" | "medium" | "high" | "critical";
export type DefectiveReportStatus = "pending" | "inspecting" | "resolved" | "destroyed";
export type DefectiveResolution = "repaired" | "destroyed" | "returned_to_supplier";

export interface IDefectiveReport extends Document {
    inventoryId: mongoose.Types.ObjectId;
    productId?: mongoose.Types.ObjectId;
    quantity: number;
    reason: string;
    images: string[];
    severity: DefectiveSeverity;
    status: DefectiveReportStatus;
    resolution?: DefectiveResolution;
    resolutionNote?: string;
    resolvedQuantity?: number;
    reportedBy: mongoose.Types.ObjectId;
    resolvedBy?: mongoose.Types.ObjectId;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const DefectiveReportSchema = new Schema<IDefectiveReport>(
    {
        inventoryId: {
            type: Schema.Types.ObjectId,
            ref: "Inventory",
            required: [true, "ID sản phẩm kho là bắt buộc"],
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            default: null,
        },
        quantity: {
            type: Number,
            required: [true, "Số lượng là bắt buộc"],
            min: [1, "Số lượng phải lớn hơn 0"],
        },
        reason: {
            type: String,
            required: [true, "Lý do là bắt buộc"],
            trim: true,
            maxlength: [2000, "Lý do không vượt quá 2000 ký tự"],
        },
        images: [
            {
                type: String,
                trim: true,
            },
        ],
        severity: {
            type: String,
            required: [true, "Mức độ nghiêm trọng là bắt buộc"],
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
        },
        status: {
            type: String,
            required: true,
            enum: ["pending", "inspecting", "resolved", "destroyed"],
            default: "pending",
        },
        resolution: {
            type: String,
            enum: ["repaired", "destroyed", "returned_to_supplier"],
        },
        resolutionNote: {
            type: String,
            trim: true,
            maxlength: [2000, "Ghi chú không vượt quá 2000 ký tự"],
        },
        resolvedQuantity: {
            type: Number,
            min: [0, "Số lượng không được âm"],
        },
        reportedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Người báo cáo là bắt buộc"],
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        resolvedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
DefectiveReportSchema.index({ inventoryId: 1, createdAt: -1 });
DefectiveReportSchema.index({ status: 1 });
DefectiveReportSchema.index({ severity: 1 });
DefectiveReportSchema.index({ reportedBy: 1 });
DefectiveReportSchema.index({ createdAt: -1 });

export const DefectiveReport = mongoose.model<IDefectiveReport>(
    "DefectiveReport",
    DefectiveReportSchema
);
