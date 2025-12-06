import mongoose, { Document, Schema } from 'mongoose';

export interface IStorySettings extends Document {
    // Hero Section
    hero: {
        backgroundImage: string;
        title: string;
        subtitle: string;
        description: string;
    };

    // Chapter 1
    chapter1: {
        image: string;
        location: string;
        locationText: string;
        title: string;
        content: string[];
        quote: string;
    };

    // Chapter 2
    chapter2: {
        title: string;
        content: string[];
        items: string[];
        images: {
            image1: string;
            image2: string;
        };
    };

    // Quote Section
    quote: {
        text: string;
        author: string;
    };

    // Video Section
    video: {
        youtubeId: string;
        title: string;
        description: string;
        enabled: boolean;
    };

    // Chapter 3
    chapter3: {
        mainImage: string;
        smallImage: string;
        smallImageLabel: string;
        title: string;
        content: string[];
        cards: Array<{
            title: string;
            content: string;
        }>;
        buttonText: string;
    };

    // Status
    status: 'draft' | 'published';
    version: number;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
}

const StorySettingsSchema = new Schema<IStorySettings>({
    hero: {
        backgroundImage: { type: String, required: true },
        title: { type: String, required: true },
        subtitle: { type: String, required: true },
        description: { type: String, required: true }
    },
    chapter1: {
        image: { type: String, required: true },
        location: { type: String, required: true },
        locationText: { type: String, required: true },
        title: { type: String, required: true },
        content: [String],
        quote: { type: String, required: true }
    },
    chapter2: {
        title: { type: String, required: true },
        content: [String],
        items: [String],
        images: {
            image1: { type: String, required: true },
            image2: { type: String, required: true }
        }
    },
    quote: {
        text: { type: String, required: true },
        author: { type: String, required: true }
    },
    video: {
        youtubeId: { type: String, default: '' },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        enabled: { type: Boolean, default: true }
    },
    chapter3: {
        mainImage: { type: String, required: true },
        smallImage: { type: String, required: true },
        smallImageLabel: { type: String, required: true },
        title: { type: String, required: true },
        content: [String],
        cards: [{
            title: String,
            content: String
        }]
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    version: {
        type: Number,
        default: 1
    },
    publishedAt: Date,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
StorySettingsSchema.index({ status: 1 });
StorySettingsSchema.index({ version: -1 });
StorySettingsSchema.index({ createdAt: -1 });

export const StorySettings = mongoose.model<IStorySettings>('StorySettings', StorySettingsSchema);

