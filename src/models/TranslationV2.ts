import mongoose, { Document, Schema } from "mongoose";

/**
 * Supported locales/countries
 * Based on Shopee-style locale codes
 */
export enum SupportedLocales {
    // Original languages
    VIETNAMESE = "vn",
    ENGLISH = "en",
    JAPANESE = "ja",
    
    // Additional locales
    ARABIC = "ar",        // Arabic
    BRAZIL = "br",        // Brazil (Portuguese)
    CHILE = "cl",         // Chile (Spanish)
    COLOMBIA = "co",      // Colombia (Spanish)
    INDONESIA = "id",     // Indonesia
    MEXICO = "mx",        // Mexico (Spanish)
    MALAYSIA = "my",      // Malaysia
    PHILIPPINES = "ph",   // Philippines
    POLAND = "pl",        // Poland
    SINGAPORE = "sg",     // Singapore
    THAILAND = "th"       // Thailand
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
    NOTIFICATION = "notification",
    SELLING_POINT = "selling_point",  // New category for selling points
    MESSAGE = "message"              // New category for messages
}

/**
 * Translation interface V2 - Supports locale in key name
 * Example keys: "Label_selling_point_1_vn", "Msg_selling_point_1_vn_short"
 */
export interface ITranslationV2 extends Document {
    key: string;                    // Full key with locale suffix (e.g., "Label_selling_point_1_vn")
    baseKey: string;                // Base key without locale (e.g., "Label_selling_point_1")
    locale: SupportedLocales;       // Extracted locale from key
    variant?: string;               // Variant like "short", "long" (from key suffix)
    category: TranslationCategories;
    value: string;                  // Translation value (single string, not nested)
    description?: string;
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Translation Schema V2
 */
const translationV2Schema = new Schema<ITranslationV2>(
    {
        key: {
            type: String,
            required: [true, "Translation key is required"],
            unique: true,
            trim: true,
            index: true
        },
        baseKey: {
            type: String,
            required: [true, "Base key is required"],
            trim: true,
            index: true
        },
        locale: {
            type: String,
            enum: Object.values(SupportedLocales),
            required: [true, "Locale is required"],
            index: true
        },
        variant: {
            type: String,
            trim: true,
            index: true
        },
        category: {
            type: String,
            enum: Object.values(TranslationCategories),
            required: [true, "Category is required"],
            index: true
        },
        value: {
            type: String,
            required: [true, "Translation value is required"],
            trim: true
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

// Compound indexes for performance
translationV2Schema.index({ baseKey: 1, locale: 1, variant: 1 });
translationV2Schema.index({ category: 1, locale: 1, isActive: 1 });
translationV2Schema.index({ baseKey: 1, locale: 1, isActive: 1 });
translationV2Schema.index({ isActive: 1, updatedAt: -1 });

// Text search index
translationV2Schema.index(
    {
        key: "text",
        baseKey: "text",
        value: "text",
        description: "text"
    },
    {
        name: "translation_v2_text_search",
        weights: {
            key: 10,
            baseKey: 8,
            value: 5,
            description: 1
        }
    }
);

/**
 * Parse key to extract baseKey, locale, and variant
 * Examples:
 * - "Label_selling_point_1_vn" -> { baseKey: "Label_selling_point_1", locale: "vn", variant: undefined }
 * - "Msg_selling_point_1_vn_short" -> { baseKey: "Msg_selling_point_1", locale: "vn", variant: "short" }
 */
translationV2Schema.statics.parseKey = function(key: string): {
    baseKey: string;
    locale: SupportedLocales | null;
    variant?: string;
} {
    const locales = Object.values(SupportedLocales);
    const variants = ["short", "long"];
    
    // Try to find locale at the end
    for (const locale of locales) {
        const localeSuffix = `_${locale}`;
        if (key.endsWith(localeSuffix)) {
            const withoutLocale = key.slice(0, -localeSuffix.length);
            return {
                baseKey: withoutLocale,
                locale: locale as SupportedLocales
            };
        }
        
        // Try with variant
        for (const variant of variants) {
            const variantSuffix = `_${variant}_${locale}`;
            if (key.endsWith(variantSuffix)) {
                const withoutVariant = key.slice(0, -variantSuffix.length);
                return {
                    baseKey: withoutVariant,
                    locale: locale as SupportedLocales,
                    variant
                };
            }
        }
    }
    
    // No locale found, return as-is
    return {
        baseKey: key,
        locale: null
    };
};

/**
 * Build key from baseKey, locale, and variant
 */
translationV2Schema.statics.buildKey = function(
    baseKey: string,
    locale: SupportedLocales,
    variant?: string
): string {
    if (variant) {
        return `${baseKey}_${variant}_${locale}`;
    }
    return `${baseKey}_${locale}`;
};

/**
 * Get translations by baseKey and locale
 */
translationV2Schema.statics.getByBaseKey = function(
    baseKey: string,
    locale: SupportedLocales,
    variant?: string
) {
    const key = variant 
        ? `${baseKey}_${variant}_${locale}`
        : `${baseKey}_${locale}`;
    
    return this.findOne({ key, isActive: true }).lean();
};

/**
 * Get all variants for a baseKey and locale
 */
translationV2Schema.statics.getVariants = function(
    baseKey: string,
    locale: SupportedLocales
) {
    return this.find({
        baseKey,
        locale,
        isActive: true
    }).lean();
};

/**
 * Pre-save middleware to auto-parse key
 */
translationV2Schema.pre("save", function(next) {
    if (this.isNew || this.isModified("key")) {
        const parsed = (this.constructor as any).parseKey(this.key);
        this.baseKey = parsed.baseKey;
        if (parsed.locale) {
            this.locale = parsed.locale;
        }
        if (parsed.variant) {
            this.variant = parsed.variant;
        }
    }
    next();
});

export const TranslationV2 = mongoose.model<ITranslationV2>("TranslationV2", translationV2Schema);

