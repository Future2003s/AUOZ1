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
exports.News = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const NewsSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    contentBlocks: [
        {
            type: {
                type: String,
                enum: ["p", "h2", "h3", "quote", "ul", "img"],
            },
            content: mongoose_1.Schema.Types.Mixed,
            id: { type: String },
            src: { type: String },
            caption: { type: String },
        },
    ],
    coverImage: { type: String },
    category: { type: String },
    tags: [{ type: String }],
    authorName: { type: String },
    authorRole: { type: String },
    readTime: { type: String },
    locale: { type: String, default: "vi", index: true },
    status: {
        type: String,
        enum: ["draft", "published"],
        default: "draft",
        index: true,
    },
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    publishedAt: { type: Date },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
exports.News = mongoose_1.default.model("News", NewsSchema);
