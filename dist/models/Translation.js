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
exports.Translation = exports.TranslationCategories = exports.SupportedLanguages = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Supported languages
 */
var SupportedLanguages;
(function (SupportedLanguages) {
    SupportedLanguages["VIETNAMESE"] = "vi";
    SupportedLanguages["ENGLISH"] = "en";
    SupportedLanguages["JAPANESE"] = "ja";
})(SupportedLanguages || (exports.SupportedLanguages = SupportedLanguages = {}));
/**
 * Translation categories for better organization
 */
var TranslationCategories;
(function (TranslationCategories) {
    TranslationCategories["PRODUCT"] = "product";
    TranslationCategories["CATEGORY"] = "category";
    TranslationCategories["BRAND"] = "brand";
    TranslationCategories["UI"] = "ui";
    TranslationCategories["ERROR"] = "error";
    TranslationCategories["SUCCESS"] = "success";
    TranslationCategories["VALIDATION"] = "validation";
    TranslationCategories["EMAIL"] = "email";
    TranslationCategories["NOTIFICATION"] = "notification";
})(TranslationCategories || (exports.TranslationCategories = TranslationCategories = {}));
/**
 * Translation Schema
 */
const translationSchema = new mongoose_1.Schema({
    key: {
        type: String,
        required: [true, "Translation key is required"],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[a-z0-9._-]+$/, "Key can only contain lowercase letters, numbers, dots, underscores and hyphens"]
    },
    category: {
        type: String,
        enum: Object.values(TranslationCategories),
        required: [true, "Category is required"],
        index: true
    },
    translations: {
        vi: {
            type: String,
            required: [true, "Vietnamese translation is required"],
            trim: true
        },
        en: {
            type: String,
            required: [true, "English translation is required"],
            trim: true
        },
        ja: {
            type: String,
            required: [true, "Japanese translation is required"],
            trim: true
        }
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, "Description cannot exceed 500 characters"]
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for performance
translationSchema.index({ key: 1 }, { unique: true });
translationSchema.index({ category: 1, isActive: 1 });
translationSchema.index({ isActive: 1, updatedAt: -1 });
translationSchema.index({ createdBy: 1 });
// Text search index for translations
translationSchema.index({
    key: "text",
    "translations.vi": "text",
    "translations.en": "text",
    "translations.ja": "text",
    description: "text"
}, {
    name: "translation_text_search",
    weights: {
        key: 10,
        "translations.vi": 5,
        "translations.en": 5,
        "translations.ja": 5,
        description: 1
    }
});
// Virtual for getting translation by language
translationSchema.virtual("getTranslation").get(function () {
    return (language) => {
        return this.translations[language] || this.translations.en; // Fallback to English
    };
});
// Static method to get translations by category
translationSchema.statics.getByCategory = function (category, language) {
    const query = this.find({ category, isActive: true }).lean();
    if (language) {
        return query.select(`key translations.${language}`);
    }
    return query;
};
// Static method to get translation by key
translationSchema.statics.getByKey = function (key, language) {
    const query = this.findOne({ key, isActive: true }).lean();
    if (language) {
        return query.select(`key translations.${language}`);
    }
    return query;
};
// Static method to bulk get translations
translationSchema.statics.getBulk = function (keys, language) {
    const query = this.find({ key: { $in: keys }, isActive: true }).lean();
    if (language) {
        return query.select(`key translations.${language}`);
    }
    return query;
};
// Pre-save middleware
translationSchema.pre("save", function (next) {
    if (this.isModified("translations")) {
        // Validate that all required translations are provided
        const requiredLanguages = Object.values(SupportedLanguages);
        for (const lang of requiredLanguages) {
            if (!this.translations[lang] || this.translations[lang].trim() === "") {
                return next(new Error(`Translation for ${lang} is required`));
            }
        }
    }
    next();
});
// Post-save middleware for cache invalidation
translationSchema.post("save", function (doc) {
    // Emit event for cache invalidation
    // this.constructor.emit('translationUpdated', {
    //     key: doc.key,
    //     category: doc.category,
    //     action: 'save'
    // });
});
// translationSchema.post('remove', function(doc) {
//     // Emit event for cache invalidation
//     this.constructor.emit('translationUpdated', {
//         key: doc.key,
//         category: doc.category,
//         action: 'remove'
//     });
// });
exports.Translation = mongoose_1.default.model("Translation", translationSchema);
