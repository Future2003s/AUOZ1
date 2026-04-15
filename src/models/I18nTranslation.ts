/**
 * I18nTranslation Model
 * Lưu trữ bản dịch theo cấu trúc locale + dot-notation key
 * Dùng cho hệ thống next-intl (/i18n/:locale)
 * Khác với Translation.ts (V1) và TranslationV2.ts (V2 locale-in-key)
 */
import mongoose, { Document, Schema } from "mongoose";

/**
 * Interface cho I18nTranslation document
 */
export interface II18nTranslation extends Document {
    locale: string;
    key: string;
    value: string;
    namespace: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Schema định nghĩa
 */
const i18nTranslationSchema = new Schema<II18nTranslation>(
    {
        locale: {
            type: String,
            required: [true, "Locale là bắt buộc"],
            trim: true,
            lowercase: true,
            enum: {
                values: ["vi", "en", "ja"],
                message: "Locale phải là vi, en hoặc ja"
            }
        },
        key: {
            type: String,
            required: [true, "Key là bắt buộc"],
            trim: true,
            // dot-notation: "home.title", "nav.login", v.v.
        },
        value: {
            type: String,
            required: [true, "Value là bắt buộc"],
            trim: true
        },
        namespace: {
            type: String,
            default: "common",
            trim: true
        }
    },
    {
        timestamps: true,
        collection: "i18n_translations"
    }
);

// Index unique trên { locale, key } để tránh trùng lặp
i18nTranslationSchema.index({ locale: 1, key: 1 }, { unique: true });

// Index hỗ trợ query nhanh theo locale
i18nTranslationSchema.index({ locale: 1 });

// Index hỗ trợ query theo namespace
i18nTranslationSchema.index({ locale: 1, namespace: 1 });

export const I18nTranslation = mongoose.model<II18nTranslation>(
    "I18nTranslation",
    i18nTranslationSchema
);
