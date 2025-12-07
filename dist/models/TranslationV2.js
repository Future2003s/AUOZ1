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
exports.TranslationV2 = exports.TranslationCategories = exports.SupportedLocales = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Supported locales/countries
 * Based on Shopee-style locale codes
 */
var SupportedLocales;
(function (SupportedLocales) {
    // Original languages
    SupportedLocales["VIETNAMESE"] = "vn";
    SupportedLocales["ENGLISH"] = "en";
    SupportedLocales["JAPANESE"] = "ja";
    // Additional locales
    SupportedLocales["ARABIC"] = "ar";
    SupportedLocales["BRAZIL"] = "br";
    SupportedLocales["CHILE"] = "cl";
    SupportedLocales["COLOMBIA"] = "co";
    SupportedLocales["INDONESIA"] = "id";
    SupportedLocales["MEXICO"] = "mx";
    SupportedLocales["MALAYSIA"] = "my";
    SupportedLocales["PHILIPPINES"] = "ph";
    SupportedLocales["POLAND"] = "pl";
    SupportedLocales["SINGAPORE"] = "sg";
    SupportedLocales["THAILAND"] = "th"; // Thailand
})(SupportedLocales || (exports.SupportedLocales = SupportedLocales = {}));
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
    TranslationCategories["SELLING_POINT"] = "selling_point";
    TranslationCategories["MESSAGE"] = "message"; // New category for messages
})(TranslationCategories || (exports.TranslationCategories = TranslationCategories = {}));
/**
 * Translation Schema V2
 */
const translationV2Schema = new mongoose_1.Schema({
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
// Compound indexes for performance
translationV2Schema.index({ baseKey: 1, locale: 1, variant: 1 });
translationV2Schema.index({ category: 1, locale: 1, isActive: 1 });
translationV2Schema.index({ baseKey: 1, locale: 1, isActive: 1 });
translationV2Schema.index({ isActive: 1, updatedAt: -1 });
// Text search index
translationV2Schema.index({
    key: "text",
    baseKey: "text",
    value: "text",
    description: "text"
}, {
    name: "translation_v2_text_search",
    weights: {
        key: 10,
        baseKey: 8,
        value: 5,
        description: 1
    }
});
/**
 * Parse key to extract baseKey, locale, and variant
 * Examples:
 * - "Label_selling_point_1_vn" -> { baseKey: "Label_selling_point_1", locale: "vn", variant: undefined }
 * - "Msg_selling_point_1_vn_short" -> { baseKey: "Msg_selling_point_1", locale: "vn", variant: "short" }
 */
translationV2Schema.statics.parseKey = function (key) {
    const locales = Object.values(SupportedLocales);
    const variants = ["short", "long"];
    // Try to find locale at the end
    for (const locale of locales) {
        const localeSuffix = `_${locale}`;
        if (key.endsWith(localeSuffix)) {
            const withoutLocale = key.slice(0, -localeSuffix.length);
            return {
                baseKey: withoutLocale,
                locale: locale
            };
        }
        // Try with variant
        for (const variant of variants) {
            const variantSuffix = `_${variant}_${locale}`;
            if (key.endsWith(variantSuffix)) {
                const withoutVariant = key.slice(0, -variantSuffix.length);
                return {
                    baseKey: withoutVariant,
                    locale: locale,
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
translationV2Schema.statics.buildKey = function (baseKey, locale, variant) {
    if (variant) {
        return `${baseKey}_${variant}_${locale}`;
    }
    return `${baseKey}_${locale}`;
};
/**
 * Get translations by baseKey and locale
 */
translationV2Schema.statics.getByBaseKey = function (baseKey, locale, variant) {
    const key = variant
        ? `${baseKey}_${variant}_${locale}`
        : `${baseKey}_${locale}`;
    return this.findOne({ key, isActive: true }).lean();
};
/**
 * Get all variants for a baseKey and locale
 */
translationV2Schema.statics.getVariants = function (baseKey, locale) {
    return this.find({
        baseKey,
        locale,
        isActive: true
    }).lean();
};
/**
 * Pre-save middleware to auto-parse key
 */
translationV2Schema.pre("save", function (next) {
    if (this.isNew || this.isModified("key")) {
        const parsed = this.constructor.parseKey(this.key);
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
exports.TranslationV2 = mongoose_1.default.model("TranslationV2", translationV2Schema);
