import mongoose, { Document, Schema } from "mongoose";

/**
 * DocumentSequence — Auto-incrementing number sequences per document type.
 * Uses MongoDB findOneAndUpdate with $inc for concurrency-safe increments.
 */
export interface IDocumentSequence extends Document {
    /** e.g. "PO", "PR", "GR", "BOM", "LOT" */
    prefix: string;
    year: number;
    lastNumber: number;
    /** Formatted: PO-2026-0001 */
    format: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const DocumentSequenceSchema = new Schema<IDocumentSequence>(
    {
        prefix: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
        year: { type: Number, required: true },
        lastNumber: { type: Number, required: true, default: 0, min: 0 },
        format: {
            type: String,
            required: true,
            default: "{PREFIX}-{YEAR}-{NUMBER}",
            maxlength: 50,
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

DocumentSequenceSchema.index({ prefix: 1, year: 1 }, { unique: true });

/**
 * Generate the next document number for a given prefix.
 * @returns e.g. "PO-2026-0042"
 */
DocumentSequenceSchema.statics.nextNumber = async function (
    prefix: string,
    year?: number,
    padLength = 4
): Promise<string> {
    const targetYear = year ?? new Date().getFullYear();
    const doc = await this.findOneAndUpdate(
        { prefix: prefix.toUpperCase(), year: targetYear },
        { $inc: { lastNumber: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const num = String(doc.lastNumber).padStart(padLength, "0");
    return `${prefix.toUpperCase()}-${targetYear}-${num}`;
};

export interface IDocumentSequenceModel extends mongoose.Model<IDocumentSequence> {
    nextNumber(prefix: string, year?: number, padLength?: number): Promise<string>;
}

export const DocumentSequence = mongoose.model<IDocumentSequence, IDocumentSequenceModel>(
    "DocumentSequence",
    DocumentSequenceSchema
);
