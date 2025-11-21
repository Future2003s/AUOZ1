import mongoose, { Document, Schema } from "mongoose";

/**
 * Supported languages
 */
export enum SupportedLanguages {
    VIETNAMESE = "vi",
    ENGLISH = "en",
    JAPANESE = "ja"
}

/**
 * Translation categories for better organization
 */
export enum TranslationCategories {
    PRODUCT = "product",
    CATEGORY = "category",
    BRAND = "brand",
    UI = "ui",
    ERROR = "error",
    SUCCESS = "success",
    VALIDATION = "validation",
    EMAIL = "email",
    NOTIFICATION = "notification"
}

/**
 * Translation interface
 */
export interface ITranslation extends Document {
    key: string;
    category: TranslationCategories;
    translations: {
        vi: string;
        en: string;
        ja: string;
    };
    description?: string;
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Translation Schema
 */
const translationSchema = new Schema<ITranslation>(
    {
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
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes for performance
translationSchema.index({ key: 1 }, { unique: true });
translationSchema.index({ category: 1, isActive: 1 });
translationSchema.index({ isActive: 1, updatedAt: -1 });
translationSchema.index({ createdBy: 1 });

// Text search index for translations
translationSchema.index(
    {
        key: "text",
        "translations.vi": "text",
        "translations.en": "text",
        "translations.ja": "text",
        description: "text"
    },
    {
        name: "translation_text_search",
        weights: {
            key: 10,
            "translations.vi": 5,
            "translations.en": 5,
            "translations.ja": 5,
            description: 1
        }
    }
);

// Virtual for getting translation by language
translationSchema.virtual("getTranslation").get(function (this: ITranslation) {
    return (language: SupportedLanguages) => {
        return this.translations[language] || this.translations.en; // Fallback to English
    };
});

// Static method to get translations by category
translationSchema.statics.getByCategory = function (category: TranslationCategories, language?: SupportedLanguages) {
    const query = this.find({ category, isActive: true }).lean();

    if (language) {
        return query.select(`key translations.${language}`);
    }

    return query;
};

// Static method to get translation by key
translationSchema.statics.getByKey = function (key: string, language?: SupportedLanguages) {
    const query = this.findOne({ key, isActive: true }).lean();

    if (language) {
        return query.select(`key translations.${language}`);
    }

    return query;
};

// Static method to bulk get translations
translationSchema.statics.getBulk = function (keys: string[], language?: SupportedLanguages) {
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

export const Translation = mongoose.model<ITranslation>("Translation", translationSchema);
