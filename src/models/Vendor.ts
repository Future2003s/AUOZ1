import mongoose, { Document, Schema } from "mongoose";

export interface IVendor extends Document {
    code: string;              // VN-0001
    name: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    taxId?: string;
    currency: string;          // "VND", "USD"
    paymentTermsDays: number;  // e.g. 30 = Net30
    creditLimitCents: number;  // 0 = no limit
    /** Outstanding payable in cents */
    outstandingCents: number;
    rating?: number;           // 1-5 vendor rating
    isActive: boolean;
    isDeleted: boolean;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
    {
        code: {
            type: String,
            required: [true, "Vendor code is required"],
            trim: true,
            uppercase: true,
            maxlength: 20,
        },
        name: {
            type: String,
            required: [true, "Vendor name is required"],
            trim: true,
            maxlength: 200,
        },
        contactName: { type: String, trim: true, maxlength: 100 },
        contactPhone: { type: String, trim: true, maxlength: 20 },
        contactEmail: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 100,
            match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
        },
        address: { type: String, trim: true, maxlength: 300 },
        taxId: { type: String, trim: true, maxlength: 20 },
        currency: { type: String, trim: true, uppercase: true, default: "VND", maxlength: 3 },
        paymentTermsDays: { type: Number, default: 30, min: 0 },
        creditLimitCents: { type: Number, default: 0, min: 0 },
        outstandingCents: { type: Number, default: 0, min: 0 },
        rating: { type: Number, min: 1, max: 5, default: null },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

VendorSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
VendorSchema.index({ name: "text" });
VendorSchema.index({ isDeleted: 1, isActive: 1 });

export const Vendor = mongoose.model<IVendor>("Vendor", VendorSchema);
