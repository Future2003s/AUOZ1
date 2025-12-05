import mongoose, { Document, Schema } from 'mongoose';

export interface IFlowerLogItem {
    type: string;
    category?: string;
    quantity: number;
}

export interface IFlowerLog extends Document {
    cutter: string;
    date: string; // YYYY-MM-DD format
    items: IFlowerLogItem[];
    history: string[];
    createdAt: Date;
    updatedAt: Date;
}

const FlowerLogItemSchema = new Schema<IFlowerLogItem>({
    type: {
        type: String,
        required: [true, 'Item type is required'],
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    }
}, { _id: false });

const FlowerLogSchema = new Schema<IFlowerLog>({
    cutter: {
        type: String,
        required: [true, 'Cutter name is required'],
        trim: true,
        maxlength: [200, 'Cutter name cannot exceed 200 characters']
    },
    date: {
        type: String,
        required: [true, 'Date is required'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
    },
    items: {
        type: [FlowerLogItemSchema],
        required: [true, 'Items are required'],
        validate: {
            validator: function(items: IFlowerLogItem[]) {
                return items && items.length > 0;
            },
            message: 'At least one item is required'
        }
    },
    history: {
        type: [String],
        default: []
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
FlowerLogSchema.index({ cutter: 1 });
FlowerLogSchema.index({ date: 1 });
FlowerLogSchema.index({ createdAt: -1 });
FlowerLogSchema.index({ cutter: 'text', 'items.type': 'text' }); // Text search index

// Virtual to convert _id to id (number-like for compatibility with frontend)
FlowerLogSchema.virtual('id').get(function() {
    return (this._id as mongoose.Types.ObjectId).toString();
});

// Ensure virtual fields are serialized
FlowerLogSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc: any, ret: any) {
        if (ret._id) {
            ret.id = (ret._id as mongoose.Types.ObjectId).toString();
            delete ret._id;
        }
        if (ret.__v !== undefined) {
            delete ret.__v;
        }
        return ret;
    }
});

export const FlowerLog = mongoose.model<IFlowerLog>('FlowerLog', FlowerLogSchema);

