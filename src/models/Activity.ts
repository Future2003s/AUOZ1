import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
    // Tiêu đề hoạt động
    title: string;
    
    // Mô tả ngắn
    shortDescription?: string;
    
    // Nội dung chi tiết (HTML)
    content: string;
    
    // Hình ảnh chính
    imageUrl?: string;
    
    // Hình ảnh phụ (gallery)
    gallery?: string[];
    
    // Ngày diễn ra hoạt động
    activityDate?: Date;
    
    // Địa điểm
    location?: string;
    
    // Trạng thái hiển thị
    published: boolean;
    
    // Thứ tự hiển thị
    order: number;
    
    // Thẻ tag
    tags?: string[];
    
    // SEO
    seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
    };
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
}

const ActivitySchema = new Schema<IActivity>({
    title: {
        type: String,
        required: [true, 'Tiêu đề hoạt động là bắt buộc'],
        trim: true,
        maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: [500, 'Mô tả ngắn không được vượt quá 500 ký tự']
    },
    content: {
        type: String,
        required: [true, 'Nội dung hoạt động là bắt buộc'],
        trim: true
    },
    imageUrl: {
        type: String,
        trim: true
    },
    gallery: [{
        type: String,
        trim: true
    }],
    activityDate: {
        type: Date
    },
    location: {
        type: String,
        trim: true,
        maxlength: [200, 'Địa điểm không được vượt quá 200 ký tự']
    },
    published: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String,
        trim: true
    }],
    seo: {
        title: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        keywords: [{
            type: String,
            trim: true
        }]
    },
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
ActivitySchema.index({ published: 1, order: -1, createdAt: -1 });
ActivitySchema.index({ activityDate: -1 });
ActivitySchema.index({ tags: 1 });
ActivitySchema.index({ title: 'text', shortDescription: 'text', content: 'text' });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);

