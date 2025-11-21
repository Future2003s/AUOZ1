"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplaintSettings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ComplaintSettingsSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});
exports.ComplaintSettings = mongoose_1.default.model('ComplaintSettings', ComplaintSettingsSchema);
