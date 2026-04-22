import mongoose, { Schema, Document } from "mongoose";

export interface IPromoWidget extends Document {
    title: string;
    description?: string;
    imageUrl?: string;
    link?: string;
    position: 'left_ad' | 'right_upcoming' | 'right_story';
    isActive: boolean;
    badgeText?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

const promoWidgetSchema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        imageUrl: { type: String },
        link: { type: String },
        position: {
            type: String,
            enum: ['left_ad', 'right_upcoming', 'right_story'],
            required: true,
        },
        isActive: { type: Boolean, default: true },
        badgeText: { type: String },
        metadata: { type: Schema.Types.Mixed }
    },
    { timestamps: true }
);

export const PromoWidget = mongoose.model<IPromoWidget>("PromoWidget", promoWidgetSchema);
