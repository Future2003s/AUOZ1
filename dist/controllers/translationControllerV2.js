"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaginatedTranslations = exports.bulkImport = exports.upsertTranslation = exports.getTranslationsByBaseKey = exports.getAllTranslations = exports.getTranslations = exports.getTranslation = void 0;
const translationServiceV2_1 = require("../services/translationServiceV2");
const TranslationV2_1 = require("../models/TranslationV2");
const asyncHandler_1 = require("../utils/asyncHandler");
const apiResponse_1 = require("../utils/apiResponse");
const translationKeyParser_1 = require("../utils/translationKeyParser");
/**
 * Get translation by key (with locale in key or as param)
 */
exports.getTranslation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { key } = req.params;
    const locale = req.query.locale || TranslationV2_1.SupportedLocales.VIETNAMESE;
    const variant = req.query.variant;
    const translation = await translationServiceV2_1.translationServiceV2.getTranslation(key, locale, variant);
    res.json(new apiResponse_1.ApiResponse(true, "Translation retrieved successfully", {
        key,
        translation,
        locale,
        variant
    }));
});
/**
 * Get multiple translations by keys
 */
exports.getTranslations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { keys } = req.body;
    const locale = req.query.locale || TranslationV2_1.SupportedLocales.VIETNAMESE;
    if (!Array.isArray(keys)) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Keys must be an array"));
    }
    const translations = await translationServiceV2_1.translationServiceV2.getTranslations(keys, locale);
    res.json(new apiResponse_1.ApiResponse(true, "Translations retrieved successfully", {
        translations,
        locale,
        count: Object.keys(translations).length
    }));
});
/**
 * Get all translations for a locale
 */
exports.getAllTranslations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const locale = req.query.locale || TranslationV2_1.SupportedLocales.VIETNAMESE;
    const translations = await translationServiceV2_1.translationServiceV2.getAllTranslations(locale);
    res.json(new apiResponse_1.ApiResponse(true, "All translations retrieved successfully", {
        translations,
        locale,
        count: Object.keys(translations).length
    }));
});
/**
 * Get translations by baseKey (all locales)
 */
exports.getTranslationsByBaseKey = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { baseKey } = req.params;
    const variant = req.query.variant;
    const translations = await translationServiceV2_1.translationServiceV2.getTranslationsByBaseKey(baseKey, variant);
    res.json(new apiResponse_1.ApiResponse(true, "Translations retrieved successfully", {
        baseKey,
        translations,
        variant
    }));
});
/**
 * Create or update translation (Admin)
 */
exports.upsertTranslation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { key, value, category, description } = req.body;
    const userId = req.user?._id;
    if (!key || !value || !category) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Key, value, and category are required"));
    }
    // Validate key has locale
    const parsed = (0, translationKeyParser_1.parseTranslationKey)(key);
    if (!parsed.locale) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Key must include locale suffix (e.g., _vn, _en)"));
    }
    if (!Object.values(TranslationV2_1.TranslationCategories).includes(category)) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Invalid category"));
    }
    const translation = await translationServiceV2_1.translationServiceV2.upsertTranslation(key, value, category, userId, description);
    res.json(new apiResponse_1.ApiResponse(true, "Translation saved successfully", {
        translation
    }));
});
/**
 * Bulk import translations (Admin)
 */
exports.bulkImport = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { translations } = req.body;
    const userId = req.user?._id;
    if (!Array.isArray(translations)) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Translations must be an array"));
    }
    const result = await translationServiceV2_1.translationServiceV2.bulkImport(translations, userId);
    res.json(new apiResponse_1.ApiResponse(true, "Bulk import completed", result));
});
/**
 * Get paginated translations (Admin)
 */
exports.getPaginatedTranslations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const locale = req.query.locale;
    const category = req.query.category;
    const search = req.query.search;
    const baseKey = req.query.baseKey;
    const skip = (page - 1) * limit;
    const query = { isActive: true };
    if (locale)
        query.locale = locale;
    if (category)
        query.category = category;
    if (baseKey)
        query.baseKey = baseKey;
    if (search) {
        query.$or = [
            { key: { $regex: search, $options: "i" } },
            { baseKey: { $regex: search, $options: "i" } },
            { value: { $regex: search, $options: "i" } }
        ];
    }
    const [translations, total] = await Promise.all([
        require("../models/TranslationV2").TranslationV2.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        require("../models/TranslationV2").TranslationV2.countDocuments(query)
    ]);
    res.json(new apiResponse_1.ApiResponse(true, "Translations retrieved successfully", {
        translations,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }));
});
