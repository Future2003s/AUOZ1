import mongoose, { Document, Schema } from 'mongoose';

export interface IPastoralImage extends Document {
    titleVi: string;
    titleEn: string;
    descVi: string;
    descEn: string;
    url: string;
    category: 'landscape' | 'life' | 'nature';
    createdAt: Date;
    updatedAt: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
}

const PastoralImageSchema = new Schema<IPastoralImage>({
    titleVi: { type: String, required: true },
    titleEn: { type: String, required: true },
    descVi: { type: String, default: "" },
    descEn: { type: String, default: "" },
    url: { type: String, required: true },
    category: {
        type: String,
        enum: ['landscape', 'life', 'nature'],
        default: 'landscape',
        required: true
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

PastoralImageSchema.index({ category: 1 });
PastoralImageSchema.index({ createdAt: -1 });

export const PastoralImage = mongoose.model<IPastoralImage>('PastoralImage', PastoralImageSchema);
