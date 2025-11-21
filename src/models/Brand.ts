import mongoose, { Document, Schema } from 'mongoose';

export interface IBrand extends Document {
    name: string;
    description?: string;
    slug: string;
    logo?: string;
    website?: string;
    isActive: boolean;
    productCount: number;
    
    // SEO
    seo: {
        title?: string;
        description?: string;
        keywords?: string[];
    };
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>({
    name: {
        type: String,
        required: [true, 'Brand name is required'],
        trim: true,
        unique: true,
        maxlength: [100, 'Brand name cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    logo: {
        type: String
    },
    website: {
        type: String,
        validate: {
            validator: function(v: string) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Website must be a valid URL'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    productCount: {
        type: Number,
        default: 0,
        min: 0
    },
    seo: {
        title: String,
        description: String,
        keywords: [String]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
BrandSchema.index({ slug: 1 });
BrandSchema.index({ isActive: 1 });
BrandSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to generate slug
BrandSchema.pre('save', function(next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    next();
});

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema);
