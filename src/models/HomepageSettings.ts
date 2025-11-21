import mongoose, { Document, Schema } from 'mongoose';

export interface IHomepageSettings extends Document {
    // Typography
    typography: {
        headingFont: string;
        bodyFont: string;
        googleFontUrl?: string;
        baseFontSize: number;
        headingSizes: {
            h1: number;
            h2: number;
            h3: number;
            h4: number;
        };
    };

    // Color Palette
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };

    // Hero Section
    hero: {
        slides: Array<{
            imageUrl: string;
            title: string;
            subtitle: string;
            ctaText: string;
            ctaLink: string;
            order: number;
        }>;
    };

    // Marquee Banner
    marquee: {
        items: string[];
        enabled: boolean;
    };

    // Featured Products
    featuredProducts: {
        productIds: mongoose.Types.ObjectId[];
        title: string;
        subtitle: string;
        enabled: boolean;
    };

    // About Section
    about: {
        title: string;
        content: string;
        imageUrl?: string;
        founderName?: string;
        founderTitle?: string;
        founderQuote?: string;
        enabled: boolean;
    };

    // Social Proof
    socialProof: {
        testimonials: Array<{
            name: string;
            text: string;
            rating: number;
        }>;
        enabled: boolean;
    };

    // Collection Section (using different name to avoid mongoose Document.collection conflict)
    collectionSection: {
        title: string;
        description: string;
        imageUrl?: string;
        enabled: boolean;
    };

    // Craft Section
    craft: {
        title: string;
        description: string;
        images: string[];
        enabled: boolean;
    };

    // Map Section
    map: {
        enabled: boolean;
        latitude?: number;
        longitude?: number;
    };

    // SEO
    seo: {
        title?: string;
        description?: string;
        keywords?: string[];
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

const HomepageSettingsSchema = new Schema<IHomepageSettings>({
    typography: {
        headingFont: {
            type: String,
            default: 'Playfair Display'
        },
        bodyFont: {
            type: String,
            default: 'Be Vietnam Pro'
        },
        googleFontUrl: String,
        baseFontSize: {
            type: Number,
            default: 16
        },
        headingSizes: {
            h1: { type: Number, default: 48 },
            h2: { type: Number, default: 36 },
            h3: { type: Number, default: 24 },
            h4: { type: Number, default: 20 }
        }
    },
    colors: {
        primary: {
            type: String,
            default: '#e11d48'
        },
        secondary: {
            type: String,
            default: '#f43f5e'
        },
        accent: {
            type: String,
            default: '#fda4af'
        },
        background: {
            type: String,
            default: '#ffffff'
        },
        text: {
            type: String,
            default: '#1e293b'
        }
    },
    hero: {
        slides: [{
            imageUrl: { type: String, required: true },
            title: { type: String, required: true },
            subtitle: { type: String, required: true },
            ctaText: { type: String, required: true },
            ctaLink: { type: String, required: true },
            order: { type: Number, default: 0 }
        }]
    },
    marquee: {
        items: [String],
        enabled: {
            type: Boolean,
            default: true
        }
    },
    featuredProducts: {
        productIds: [{
            type: Schema.Types.ObjectId,
            ref: 'Product'
        }],
        title: {
            type: String,
            default: 'Sản Phẩm Nổi Bật'
        },
        subtitle: {
            type: String,
            default: 'Những sáng tạo độc đáo từ LALA-LYCHEE'
        },
        enabled: {
            type: Boolean,
            default: true
        }
    },
    about: {
        title: String,
        content: String,
        imageUrl: String,
        founderName: String,
        founderTitle: String,
        founderQuote: String,
        enabled: {
            type: Boolean,
            default: true
        }
    },
    socialProof: {
        testimonials: [{
            name: String,
            text: String,
            rating: {
                type: Number,
                min: 1,
                max: 5
            }
        }],
        enabled: {
            type: Boolean,
            default: true
        }
    },
    collectionSection: {
        title: String,
        description: String,
        imageUrl: String,
        enabled: {
            type: Boolean,
            default: true
        }
    },
    craft: {
        title: String,
        description: String,
        images: [String],
        enabled: {
            type: Boolean,
            default: true
        }
    },
    map: {
        enabled: {
            type: Boolean,
            default: true
        },
        latitude: Number,
        longitude: Number
    },
    seo: {
        title: String,
        description: String,
        keywords: [String]
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
HomepageSettingsSchema.index({ status: 1 });
HomepageSettingsSchema.index({ version: -1 });
HomepageSettingsSchema.index({ createdAt: -1 });

export const HomepageSettings = mongoose.model<IHomepageSettings>('HomepageSettings', HomepageSettingsSchema);

