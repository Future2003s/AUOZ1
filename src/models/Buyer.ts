import mongoose, { Document, Schema } from "mongoose";

export interface IBuyer extends Document {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const BuyerSchema = new Schema<IBuyer>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        phone: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        address: {
            type: String,
            trim: true
        },
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
BuyerSchema.index({ name: 1 });
BuyerSchema.index({ phone: 1 });
BuyerSchema.index({ createdAt: -1 });

export const Buyer = mongoose.model<IBuyer>("Buyer", BuyerSchema);

