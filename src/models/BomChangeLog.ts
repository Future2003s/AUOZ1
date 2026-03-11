import mongoose, { Document, Schema } from "mongoose";

export type ChangeAction = "CREATED" | "UPDATED" | "DELETED" | "STATUS_CHANGED" | "VERSION_BUMPED";

export interface IBomChangeLog extends Document {
    bomId: mongoose.Types.ObjectId;
    action: ChangeAction;
    /** Snapshot of the previous state (before change) */
    previousValue?: Record<string, unknown>;
    /** Snapshot of the new state (after change) */
    newValue?: Record<string, unknown>;
    changedFields?: string[];
    reason?: string;
    changedBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const BomChangeLogSchema = new Schema<IBomChangeLog>(
    {
        bomId: { type: Schema.Types.ObjectId, ref: "BomHeader", required: true },
        action: {
            type: String,
            required: true,
            enum: ["CREATED", "UPDATED", "DELETED", "STATUS_CHANGED", "VERSION_BUMPED"],
        },
        previousValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
        changedFields: { type: [String], default: [] },
        reason: { type: String, trim: true, maxlength: 500 },
        changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // immutable audit log
    }
);

BomChangeLogSchema.index({ bomId: 1, createdAt: -1 });
BomChangeLogSchema.index({ changedBy: 1 });

export const BomChangeLog = mongoose.model<IBomChangeLog>("BomChangeLog", BomChangeLogSchema);
