import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
    product: mongoose.Types.ObjectId;
    quantity: number;
    price: number; // Price at the time of adding to cart
    variant?: {
        name: string;
        value: string;
    }[];
    addedAt: Date;
}

export interface ICart extends Document {
    user?: mongoose.Types.ObjectId; // Optional for guest carts
    sessionId?: string; // For guest users
    items: ICartItem[];
    totalItems: number;
    totalPrice: number;
    currency: string;
    
    // Cart metadata
    isActive: boolean;
    expiresAt?: Date; // For guest carts
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    
    // Virtual fields
    isEmpty: boolean;
    
    // Methods
    addItem(productId: string, quantity: number, price: number, variant?: any[]): Promise<ICart>;
    updateItem(productId: string, quantity: number): Promise<ICart>;
    removeItem(productId: string): Promise<ICart>;
    clearCart(): Promise<ICart>;
    calculateTotals(): void;
}

const CartItemSchema = new Schema<ICartItem>({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    variant: [{
        name: { type: String, required: true },
        value: { type: String, required: true }
    }],
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const CartSchema = new Schema<ICart>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        sparse: true // Allows null values and creates sparse index
    },
    sessionId: {
        type: String,
        sparse: true // For guest carts
    },
    items: [CartItemSchema],
    totalItems: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 } // TTL index for guest carts
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for checking if cart is empty
CartSchema.virtual('isEmpty').get(function() {
    return this.items.length === 0;
});

// Indexes
CartSchema.index({ user: 1 }, { unique: true, sparse: true });
CartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
CartSchema.index({ isActive: 1 });
CartSchema.index({ updatedAt: -1 });

// Methods
CartSchema.methods.addItem = async function(
    productId: string, 
    quantity: number, 
    price: number, 
    variant?: any[]
): Promise<ICart> {
    const existingItemIndex = this.items.findIndex((item: ICartItem) => {
        const sameProduct = item.product.toString() === productId;
        const sameVariant = JSON.stringify(item.variant || []) === JSON.stringify(variant || []);
        return sameProduct && sameVariant;
    });

    if (existingItemIndex > -1) {
        // Update existing item
        this.items[existingItemIndex].quantity += quantity;
        this.items[existingItemIndex].addedAt = new Date();
    } else {
        // Add new item
        this.items.push({
            product: new mongoose.Types.ObjectId(productId),
            quantity,
            price,
            variant,
            addedAt: new Date()
        } as ICartItem);
    }

    this.calculateTotals();
    return this.save();
};

CartSchema.methods.updateItem = async function(
    productId: string, 
    quantity: number
): Promise<ICart> {
    const itemIndex = this.items.findIndex((item: ICartItem) => 
        item.product.toString() === productId
    );

    if (itemIndex === -1) {
        throw new Error('Item not found in cart');
    }

    if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        this.items.splice(itemIndex, 1);
    } else {
        this.items[itemIndex].quantity = quantity;
        this.items[itemIndex].addedAt = new Date();
    }

    this.calculateTotals();
    return this.save();
};

CartSchema.methods.removeItem = async function(productId: string): Promise<ICart> {
    this.items = this.items.filter((item: ICartItem) => 
        item.product.toString() !== productId
    );

    this.calculateTotals();
    return this.save();
};

CartSchema.methods.clearCart = async function(): Promise<ICart> {
    this.items = [];
    this.calculateTotals();
    return this.save();
};

CartSchema.methods.calculateTotals = function(): void {
    this.totalItems = this.items.reduce((total: number, item: ICartItem) => 
        total + item.quantity, 0
    );
    
    this.totalPrice = this.items.reduce((total: number, item: ICartItem) => 
        total + (item.price * item.quantity), 0
    );
};

// Pre-save middleware to calculate totals
CartSchema.pre('save', function(next) {
    this.calculateTotals();
    next();
});

// Pre-save middleware to set expiration for guest carts
CartSchema.pre('save', function(next) {
    if (this.sessionId && !this.user && !this.expiresAt) {
        // Set expiration to 30 days for guest carts
        this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    next();
});

export const Cart = mongoose.model<ICart>('Cart', CartSchema);
