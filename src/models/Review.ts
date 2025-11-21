import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
    product: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
    
    // Verification
    isVerifiedPurchase: boolean;
    
    // Moderation
    status: 'pending' | 'approved' | 'rejected';
    moderatedBy?: mongoose.Types.ObjectId;
    moderatedAt?: Date;
    moderationNote?: string;
    
    // Helpfulness
    helpfulCount: number;
    notHelpfulCount: number;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    title: {
        type: String,
        trim: true,
        maxlength: [200, 'Review title cannot exceed 200 characters']
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [2000, 'Review comment cannot exceed 2000 characters']
    },
    images: [{
        type: String
    }],
    isVerifiedPurchase: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    moderatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    moderatedAt: Date,
    moderationNote: String,
    helpfulCount: {
        type: Number,
        default: 0,
        min: 0
    },
    notHelpfulCount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index to ensure one review per user per product
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
ReviewSchema.index({ product: 1, status: 1 });
ReviewSchema.index({ user: 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ createdAt: -1 });

// Virtual for helpfulness ratio
ReviewSchema.virtual('helpfulnessRatio').get(function() {
    const total = this.helpfulCount + this.notHelpfulCount;
    return total > 0 ? this.helpfulCount / total : 0;
});

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
