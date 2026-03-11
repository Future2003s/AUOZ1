import mongoose, { Document, Schema } from 'mongoose';

export interface IFlowerImportLogItem {
    type: string;
    category?: string;
    quantity: number;
}

export interface IFlowerImportLog extends Document {
    importer: string;
    date: string; // YYYY-MM-DD format
    items: IFlowerImportLogItem[];
    history: string[];
    createdAt: Date;
    updatedAt: Date;
}

const FlowerImportLogItemSchema = new Schema<IFlowerImportLogItem>({
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

const FlowerImportLogSchema = new Schema<IFlowerImportLog>({
    importer: {
        type: String,
        required: [true, 'Importer name is required'],
        trim: true,
        maxlength: [200, 'Importer name cannot exceed 200 characters']
    },
    date: {
        type: String,
        required: [true, 'Date is required'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
    },
    items: {
        type: [FlowerImportLogItemSchema],
        required: [true, 'Items are required'],
        validate: {
            validator: function(items: IFlowerImportLogItem[]) {
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
FlowerImportLogSchema.index({ importer: 1 });
FlowerImportLogSchema.index({ date: 1 });
FlowerImportLogSchema.index({ createdAt: -1 });
FlowerImportLogSchema.index({ importer: 'text', 'items.type': 'text' }); // Text search index

// Virtual to convert _id to id (number-like for compatibility with frontend)
FlowerImportLogSchema.virtual('id').get(function() {
    return (this._id as mongoose.Types.ObjectId).toString();
});

// Ensure virtual fields are serialized
FlowerImportLogSchema.set('toJSON', {
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

export const FlowerImportLog = mongoose.model<IFlowerImportLog>('FlowerImportLog', FlowerImportLogSchema);
