import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    slug?: string; // URL-friendly identifier
    description?: string;
    shortDescription?: string;
    price: number;
    comparePrice?: number;
    costPrice?: number;
    currency?: string; // VND, USD, etc.
    sku: string;
    barcode?: string;
    trackQuantity: boolean;
    quantity: number;
    allowBackorder: boolean;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
        unit: 'cm' | 'in';
    };
    
    // Product details
    ingredients?: string; // Thành phần
    nutrition?: {
        energyKcal?: number;
        proteinG?: number;
        fatG?: number;
        totalSugarG?: number;
        sugarRangeG?: string; // "15-16"
        sodiumMg?: number;
    };
    volumeMl?: number; // Dung tích (ml)
    supervisedBy?: string; // Giám sát bởi
    claims?: string[]; // Tiêu chí (3 Không)
    
    // Category and Brand
    category: mongoose.Types.ObjectId;
    brand?: mongoose.Types.ObjectId;
    tags: string[];
    
    // Images and Media
    images: Array<{
        url: string;
        alt?: string;
        isMain: boolean;
        order: number;
    }>;
    
    // Variants
    hasVariants: boolean;
    variants: Array<{
        name: string;
        options: string[];
    }>;
    
    // SEO
    seo: {
        title?: string;
        description?: string;
        keywords?: string[];
    };
    
    // Status and Visibility
    status: 'draft' | 'active' | 'archived';
    isVisible: boolean;
    isFeatured: boolean;
    
    // Pricing and Discounts
    onSale: boolean;
    salePrice?: number;
    saleStartDate?: Date;
    saleEndDate?: Date;
    
    // Shipping
    requiresShipping: boolean;
    shippingClass?: string;
    
    // Reviews and Ratings
    averageRating: number;
    reviewCount: number;
    
    // Timestamps
    publishedAt?: Date;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    
    // Virtual fields
    finalPrice: number;
    isInStock: boolean;
    stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
}

const ProductSchema = new Schema<IProduct>({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    slug: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
        index: true
    },
    description: {
        type: String,
        required: false,
        default: '',
        maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    shortDescription: {
        type: String,
        maxlength: [500, 'Short description cannot exceed 500 characters']
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price cannot be negative']
    },
    comparePrice: {
        type: Number,
        min: [0, 'Compare price cannot be negative']
    },
    costPrice: {
        type: Number,
        min: [0, 'Cost price cannot be negative']
    },
    currency: {
        type: String,
        default: 'VND',
        uppercase: true
    },
    ingredients: {
        type: String,
        trim: true
    },
    nutrition: {
        energyKcal: { type: Number, min: 0 },
        proteinG: { type: Number, min: 0 },
        fatG: { type: Number, min: 0 },
        totalSugarG: { type: Number, min: 0 },
        sugarRangeG: String, // "15-16"
        sodiumMg: { type: Number, min: 0 }
    },
    volumeMl: {
        type: Number,
        min: [0, 'Volume cannot be negative']
    },
    supervisedBy: {
        type: String,
        trim: true
    },
    claims: [{
        type: String,
        trim: true
    }],
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    barcode: {
        type: String,
        trim: true
    },
    trackQuantity: {
        type: Boolean,
        default: true
    },
    quantity: {
        type: Number,
        default: 0,
        min: [0, 'Quantity cannot be negative']
    },
    allowBackorder: {
        type: Boolean,
        default: false
    },
    weight: {
        type: Number,
        min: [0, 'Weight cannot be negative']
    },
    dimensions: {
        length: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
        unit: { type: String, enum: ['cm', 'in'], default: 'cm' }
    },
    
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Product category is required']
    },
    brand: {
        type: Schema.Types.ObjectId,
        ref: 'Brand'
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
    images: [{
        url: { type: String, required: true },
        alt: String,
        isMain: { type: Boolean, default: false },
        order: { type: Number, default: 0 }
    }],
    
    hasVariants: {
        type: Boolean,
        default: false
    },
    variants: [{
        name: { type: String, required: true },
        options: [{ type: String, required: true }]
    }],
    
    seo: {
        title: String,
        description: String,
        keywords: [String]
    },
    
    status: {
        type: String,
        enum: ['draft', 'active', 'archived'],
        default: 'draft'
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    
    onSale: {
        type: Boolean,
        default: false
    },
    salePrice: {
        type: Number,
        min: [0, 'Sale price cannot be negative']
    },
    saleStartDate: Date,
    saleEndDate: Date,
    
    requiresShipping: {
        type: Boolean,
        default: true
    },
    shippingClass: String,
    
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    publishedAt: Date,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
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

// Virtual for final price (considering sale)
ProductSchema.virtual('finalPrice').get(function() {
    if (this.onSale && this.salePrice && this.salePrice > 0) {
        const now = new Date();
        const saleActive = (!this.saleStartDate || now >= this.saleStartDate) &&
                          (!this.saleEndDate || now <= this.saleEndDate);
        return saleActive ? this.salePrice : this.price;
    }
    return this.price;
});

// Virtual for stock status
ProductSchema.virtual('isInStock').get(function() {
    if (!this.trackQuantity) return true;
    return this.quantity > 0 || this.allowBackorder;
});

ProductSchema.virtual('stockStatus').get(function() {
    if (!this.trackQuantity) return 'in_stock';
    if (this.quantity <= 0) return this.allowBackorder ? 'in_stock' : 'out_of_stock';
    if (this.quantity <= 10) return 'low_stock'; // Low stock threshold
    return 'in_stock';
});

// Indexes for better performance
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ slug: 1 }, { unique: true, sparse: true });
ProductSchema.index({ category: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ status: 1, isVisible: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ averageRating: -1 });

// Pre-save middleware
ProductSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    next();
});

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
