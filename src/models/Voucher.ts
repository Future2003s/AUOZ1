import mongoose, { Document, Schema } from "mongoose";

export type VoucherDiscountType = "percentage" | "fixed";
export type VoucherStatus = "draft" | "scheduled" | "active" | "expired" | "disabled";

export interface IUserVoucherUsage {
    user: mongoose.Types.ObjectId;
    count: number;
    lastUsedAt?: Date;
}

export interface IVoucher extends Document {
    code: string;
    name: string;
    description?: string;
    discountType: VoucherDiscountType;
    discountValue: number;
    maxDiscountValue?: number;
    minOrderValue: number;
    startDate?: Date;
    endDate?: Date;
    usageLimit?: number;
    usageCount: number;
    perUserLimit?: number;
    userUsage: IUserVoucherUsage[];
    autoApply: boolean;
    tags: string[];
    status: VoucherStatus;
    isActive: boolean;
    lastUsedAt?: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const VoucherUsageSchema = new Schema<IUserVoucherUsage>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        },
        lastUsedAt: Date
    },
    { _id: false }
);

const VoucherSchema = new Schema<IVoucher>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            minlength: 3,
            maxlength: 32
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        description: {
            type: String,
            maxlength: 512
        },
        discountType: {
            type: String,
            enum: ["percentage", "fixed"],
            default: "fixed"
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0,
            max: 100000000 // 100M VND safety
        },
        maxDiscountValue: {
            type: Number,
            min: 0
        },
        minOrderValue: {
            type: Number,
            default: 0,
            min: 0
        },
        startDate: Date,
        endDate: Date,
        usageLimit: {
            type: Number,
            min: 1
        },
        usageCount: {
            type: Number,
            default: 0,
            min: 0
        },
        perUserLimit: {
            type: Number,
            min: 1
        },
        userUsage: {
            type: [VoucherUsageSchema],
            default: []
        },
        autoApply: {
            type: Boolean,
            default: false
        },
        tags: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            enum: ["draft", "scheduled", "active", "expired", "disabled"],
            default: "draft"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        lastUsedAt: Date,
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
        timestamps: true
    }
);

VoucherSchema.index({ code: 1 }, { unique: true });
VoucherSchema.index({ status: 1, isActive: 1 });
VoucherSchema.index({ startDate: 1, endDate: 1 });
VoucherSchema.index({ usageCount: 1 });

export const Voucher = mongoose.model<IVoucher>("Voucher", VoucherSchema);

