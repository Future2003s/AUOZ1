import mongoose, { Document, Schema } from "mongoose";

export interface IEmployeeNavUsage extends Document {
    userId: mongoose.Types.ObjectId;
    itemId: string;
    count: number;
    lastUsed: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EmployeeNavUsageSchema = new Schema<IEmployeeNavUsage>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        itemId: {
            type: String,
            required: true,
            trim: true
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        },
        lastUsed: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

EmployeeNavUsageSchema.index({ userId: 1, itemId: 1 }, { unique: true });

export const EmployeeNavUsage = mongoose.model<IEmployeeNavUsage>(
    "EmployeeNavUsage",
    EmployeeNavUsageSchema
);

