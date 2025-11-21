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
exports.HomepageSettings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const HomepageSettingsSchema = new mongoose_1.Schema({
    typography: {
        headingFont: {
            type: String,
            default: 'Playfair Display'
        },
        bodyFont: {
            type: String,
            default: 'Be Vietnam Pro'
        },
        googleFontUrl: String,
        baseFontSize: {
            type: Number,
            default: 16
        },
        headingSizes: {
            h1: { type: Number, default: 48 },
            h2: { type: Number, default: 36 },
            h3: { type: Number, default: 24 },
            h4: { type: Number, default: 20 }
        }
    },
    colors: {
        primary: {
            type: String,
            default: '#e11d48'
        },
        secondary: {
            type: String,
            default: '#f43f5e'
        },
        accent: {
            type: String,
            default: '#fda4af'
        },
        background: {
            type: String,
            default: '#ffffff'
        },
        text: {
            type: String,
            default: '#1e293b'
        }
    },
    hero: {
        slides: [{
                imageUrl: { type: String, required: true },
                title: { type: String, required: true },
                subtitle: { type: String, required: true },
                ctaText: { type: String, required: true },
                ctaLink: { type: String, required: true },
                order: { type: Number, default: 0 }
            }]
    },
    marquee: {
        items: [String],
        enabled: {
            type: Boolean,
            default: true
        }
    },
    featuredProducts: {
        productIds: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product'
            }],
        title: {
            type: String,
            default: 'Sản Phẩm Nổi Bật'
        },
        subtitle: {
            type: String,
            default: 'Những sáng tạo độc đáo từ LALA-LYCHEE'
        },
        enabled: {
            type: Boolean,
            default: true
        }
    },
    about: {
        title: String,
        content: String,
        imageUrl: String,
        founderName: String,
        founderTitle: String,
        founderQuote: String,
        enabled: {
            type: Boolean,
            default: true
        }
    },
    socialProof: {
        testimonials: [{
                name: String,
                text: String,
                rating: {
                    type: Number,
                    min: 1,
                    max: 5
                }
            }],
        enabled: {
            type: Boolean,
            default: true
        }
    },
    collectionSection: {
        title: String,
        description: String,
        imageUrl: String,
        enabled: {
            type: Boolean,
            default: true
        }
    },
    craft: {
        title: {
            type: String,
            default: 'Quy Trình Sáng Tạo'
        },
        description: {
            type: String,
            default: 'Hành trình từ trái vải tươi ngon đến sản phẩm tinh hoa trên tay bạn.'
        },
        images: [String],
        steps: [{
                title: String,
                description: String,
                imageUrl: String,
                order: {
                    type: Number,
                    default: 0
                }
            }],
        enabled: {
            type: Boolean,
            default: true
        }
    },
    map: {
        enabled: {
            type: Boolean,
            default: true
        },
        latitude: Number,
        longitude: Number
    },
    seo: {
        title: String,
        description: String,
        keywords: [String]
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    version: {
        type: Number,
        default: 1
    },
    publishedAt: Date,
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
HomepageSettingsSchema.index({ status: 1 });
HomepageSettingsSchema.index({ version: -1 });
HomepageSettingsSchema.index({ createdAt: -1 });
exports.HomepageSettings = mongoose_1.default.model('HomepageSettings', HomepageSettingsSchema);
