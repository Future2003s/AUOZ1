import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    description?: string;
    slug: string;
    parent?: mongoose.Types.ObjectId;
    image?: string;
    icon?: string;
    isActive: boolean;
    sortOrder: number;
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
    
    // Virtual fields
    level: number;
    path: string;
    children: ICategory[];
}

const CategorySchema = new Schema<ICategory>({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [100, 'Category name cannot exceed 100 characters']
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
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    image: {
        type: String
    },
    icon: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
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

// Virtual for category level (depth in hierarchy)
CategorySchema.virtual('level').get(function() {
    // This would need to be calculated based on parent chain
    return 0; // Placeholder
});

// Virtual for category path
CategorySchema.virtual('path').get(function() {
    // This would build the full path like "Electronics > Phones > Smartphones"
    return this.name; // Placeholder
});

// Virtual populate for children
CategorySchema.virtual('children', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent'
});

// Indexes
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parent: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ sortOrder: 1 });
CategorySchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to generate slug
CategorySchema.pre('save', function(next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    next();
});

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
