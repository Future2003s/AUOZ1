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
exports.StorySettings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StorySettingsSchema = new mongoose_1.Schema({
    hero: {
        backgroundImage: { type: String, required: true },
        title: { type: String, required: true },
        subtitle: { type: String, required: true },
        description: { type: String, required: true }
    },
    chapter1: {
        image: { type: String, required: true },
        location: { type: String, required: true },
        locationText: { type: String, required: true },
        title: { type: String, required: true },
        content: [String],
        quote: { type: String, required: true }
    },
    chapter2: {
        title: { type: String, required: true },
        content: [String],
        items: [String],
        images: {
            image1: { type: String, required: true },
            image2: { type: String, required: true }
        }
    },
    quote: {
        text: { type: String, required: true },
        author: { type: String, required: true }
    },
    video: {
        youtubeId: { type: String, default: '' },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        enabled: { type: Boolean, default: true }
    },
    chapter3: {
        mainImage: { type: String, required: true },
        smallImage: { type: String, required: true },
        smallImageLabel: { type: String, required: true },
        title: { type: String, required: true },
        content: [String],
        cards: [{
                title: String,
                content: String
            }]
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
StorySettingsSchema.index({ status: 1 });
StorySettingsSchema.index({ version: -1 });
StorySettingsSchema.index({ createdAt: -1 });
exports.StorySettings = mongoose_1.default.model('StorySettings', StorySettingsSchema);
