import mongoose, { Document, Schema } from 'mongoose';

export interface IAdvertisement extends Document {
    // Trạng thái hiển thị
    enabled: boolean;
    
    // Nội dung quảng cáo
    title?: string;
    content: string; // HTML hoặc text
    imageUrl?: string; // URL hình ảnh quảng cáo
    
    // Link khi click vào quảng cáo
    link?: string;
    linkText?: string; // Text của button link
    
    // Thời gian delay trước khi hiển thị (milliseconds)
    delayTime: number; // Mặc định 0 (hiển thị ngay)
    
    // Kích thước modal
    width?: string; // CSS width, mặc định 'auto'
    height?: string; // CSS height, mặc định 'auto'
    maxWidth?: string; // CSS max-width, mặc định '90vw'
    maxHeight?: string; // CSS max-height, mặc định '90vh'
    
    // Vị trí hiển thị
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
    
    // Tùy chọn đóng modal
    showCloseButton: boolean;
    closeOnClickOutside: boolean;
    closeOnEscape: boolean;
    
    // Thời gian tự động đóng (milliseconds, 0 = không tự đóng)
    autoCloseTime?: number;
    
    // Thứ tự ưu tiên (nếu có nhiều quảng cáo)
    priority: number;
    
    // Ngày bắt đầu và kết thúc hiển thị
    startDate?: Date;
    endDate?: Date;
    
    // Target audience (tùy chọn)
    targetAudience?: {
        roles?: string[]; // Chỉ hiển thị cho các role này
        locales?: string[]; // Chỉ hiển thị cho các locale này
    };
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
}

const AdvertisementSchema = new Schema<IAdvertisement>({
    enabled: {
        type: Boolean,
        default: true
    },
    title: {
        type: String,
        trim: true
    },
    content: {
        type: String,
        required: [true, 'Nội dung quảng cáo là bắt buộc'],
        trim: true
    },
    imageUrl: {
        type: String,
        trim: true
    },
    link: {
        type: String,
        trim: true
    },
    linkText: {
        type: String,
        default: 'Xem thêm',
        trim: true
    },
    delayTime: {
        type: Number,
        default: 0,
        min: 0
    },
    width: {
        type: String,
        default: 'auto'
    },
    height: {
        type: String,
        default: 'auto'
    },
    maxWidth: {
        type: String,
        default: '90vw'
    },
    maxHeight: {
        type: String,
        default: '90vh'
    },
    position: {
        type: String,
        enum: ['center', 'top', 'bottom', 'left', 'right'],
        default: 'center'
    },
    showCloseButton: {
        type: Boolean,
        default: true
    },
    closeOnClickOutside: {
        type: Boolean,
        default: true
    },
    closeOnEscape: {
        type: Boolean,
        default: true
    },
    autoCloseTime: {
        type: Number,
        default: 0,
        min: 0
    },
    priority: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    targetAudience: {
        roles: [{
            type: String
        }],
        locales: [{
            type: String
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
AdvertisementSchema.index({ enabled: 1, priority: -1 });
AdvertisementSchema.index({ startDate: 1, endDate: 1 });
AdvertisementSchema.index({ createdAt: -1 });

// Virtual để kiểm tra quảng cáo có đang active không
AdvertisementSchema.virtual('isActive').get(function() {
    if (!this.enabled) return false;
    
    const now = new Date();
    if (this.startDate && now < this.startDate) return false;
    if (this.endDate && now > this.endDate) return false;
    
    return true;
});

export const Advertisement = mongoose.model<IAdvertisement>('Advertisement', AdvertisementSchema);

