import mongoose, { Document, Schema } from 'mongoose';

export interface IComplaintStep {
    title: string;
    description?: string;
}

export interface IComplaintSettings extends Document {
    heroTitle: string;
    heroSubtitle: string;
    processTitle: string;
    processDescription: string;
    steps: IComplaintStep[];
    hotlineLabel: string;
    hotlineNumber: string;
    hotlineHours: string;
    email: string;
    emailNote: string;
    guaranteeText: string;
    updatedBy?: mongoose.Types.ObjectId;
}

const ComplaintSettingsSchema = new Schema<IComplaintSettings>({
    heroTitle: {
        type: String,
        default: 'Giải Quyết Khiếu Nại'
    },
    heroSubtitle: {
        type: String,
        default: 'Chúng tôi luôn sẵn sàng lắng nghe và xử lý tận tâm trong vòng 24h làm việc.'
    },
    processTitle: {
        type: String,
        default: 'Quy trình tiếp nhận & xử lý'
    },
    processDescription: {
        type: String,
        default: 'Mọi khiếu nại được ghi nhận và xử lý minh bạch qua 4 bước.'
    },
    steps: [{
        title: { type: String, required: true },
        description: String
    }],
    hotlineLabel: {
        type: String,
        default: 'Hotline hỗ trợ'
    },
    hotlineNumber: {
        type: String,
        default: '(+84) 0962-215-666'
    },
    hotlineHours: {
        type: String,
        default: '08:00 – 20:00 (T2 – CN)'
    },
    email: {
        type: String,
        default: 'claim@lalalychee.com'
    },
    emailNote: {
        type: String,
        default: 'Hỗ trợ 24/7 qua email, phản hồi <24h'
    },
    guaranteeText: {
        type: String,
        default: 'Toàn bộ khiếu nại được bảo mật theo chính sách dữ liệu của LALA-LYCHEEE.'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

export const ComplaintSettings = mongoose.model<IComplaintSettings>('ComplaintSettings', ComplaintSettingsSchema);


