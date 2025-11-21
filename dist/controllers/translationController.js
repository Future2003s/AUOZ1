"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportTranslations = exports.bulkImportTranslations = exports.getTranslationStats = exports.searchTranslations = exports.deleteTranslation = exports.updateTranslation = exports.createTranslation = exports.getPaginatedTranslations = exports.getAllTranslations = exports.getTranslationsByCategory = exports.getTranslations = exports.getTranslation = void 0;
const translationService_1 = require("../services/translationService");
const Translation_1 = require("../models/Translation");
const asyncHandler_1 = require("../utils/asyncHandler");
const apiResponse_1 = require("../utils/apiResponse");
// import { paginationService } from '../utils/pagination';
/**
 * Get translation by key
 */
exports.getTranslation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { key } = req.params;
    const language = req.query.lang || Translation_1.SupportedLanguages.ENGLISH;
    const translation = await translationService_1.translationService.getTranslation(key, language);
    res.json(new apiResponse_1.ApiResponse(true, "Translation retrieved successfully", {
        key,
        translation,
        language
    }));
});
/**
 * Get multiple translations by keys
 */
exports.getTranslations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { keys } = req.body;
    const language = req.query.lang || Translation_1.SupportedLanguages.ENGLISH;
    if (!Array.isArray(keys)) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Keys must be an array"));
    }
    const translations = await translationService_1.translationService.getTranslations(keys, language);
    res.json(new apiResponse_1.ApiResponse(true, "Translations retrieved successfully", {
        translations,
        language,
        count: Object.keys(translations).length
    }));
});
/**
 * Get translations by category
 */
exports.getTranslationsByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category } = req.params;
    const language = req.query.lang || Translation_1.SupportedLanguages.ENGLISH;
    if (!Object.values(Translation_1.TranslationCategories).includes(category)) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Invalid category"));
    }
    const translations = await translationService_1.translationService.getTranslationsByCategory(category, language);
    res.json(new apiResponse_1.ApiResponse(true, "Category translations retrieved successfully", {
        category,
        translations,
        language,
        count: Object.keys(translations).length
    }));
});
/**
 * Get all translations for a language
 */
exports.getAllTranslations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const language = req.query.lang || Translation_1.SupportedLanguages.ENGLISH;
    const translations = await translationService_1.translationService.getAllTranslations(language);
    res.json(new apiResponse_1.ApiResponse(true, "All translations retrieved successfully", {
        translations,
        language,
        count: Object.keys(translations).length
    }));
});
/**
 * Get paginated translations (Admin)
 */
exports.getPaginatedTranslations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;
    const search = req.query.search;
    const isActive = req.query.isActive;
    // Build filter
    const filter = {};
    if (category)
        filter.category = category;
    if (isActive !== undefined)
        filter.isActive = isActive === "true";
    // Build query
    let query = Translation_1.Translation.find(filter);
    // Add search if provided
    if (search) {
        query = query.find({ $text: { $search: search } });
    }
    // Get paginated results
    // Simplified pagination without paginationService
    const skip = (page - 1) * limit;
    const total = await query.countDocuments();
    const translations = await query
        .skip(skip)
        .limit(limit)
        .populate([
        { path: "createdBy", select: "firstName lastName email" },
        { path: "updatedBy", select: "firstName lastName email" }
    ])
        .sort(search ? { score: { $meta: "textScore" } } : { updatedAt: -1 });
    const result = {
        data: translations,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
    res.json(new apiResponse_1.ApiResponse(true, "Translations retrieved successfully", result));
});
/**
 * Create new translation (Admin)
 */
exports.createTranslation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { key, category, translations, description } = req.body;
    const userId = req.user.id;
    // Validate required fields
    if (!key || !category || !translations) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Key, category, and translations are required"));
    }
    // Validate category
    if (!Object.values(Translation_1.TranslationCategories).includes(category)) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Invalid category"));
    }
    // Validate translations object
    const requiredLanguages = Object.values(Translation_1.SupportedLanguages);
    for (const lang of requiredLanguages) {
        if (!translations[lang] || translations[lang].trim() === "") {
            return res.status(400).json(new apiResponse_1.ApiResponse(false, `Translation for ${lang} is required`));
        }
    }
    // Check if key already exists
    const existingTranslation = await Translation_1.Translation.findOne({ key });
    if (existingTranslation) {
        return res.status(409).json(new apiResponse_1.ApiResponse(false, "Translation key already exists"));
    }
    const translation = await translationService_1.translationService.createTranslation({
        key,
        category,
        translations,
        description,
        createdBy: userId
    });
    res.status(201).json(new apiResponse_1.ApiResponse(true, "Translation created successfully", translation));
});
/**
 * Update translation (Admin)
 */
exports.updateTranslation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { key } = req.params;
    const { translations, description, isActive } = req.body;
    const userId = req.user.id;
    const translation = await translationService_1.translationService.updateTranslation(key, {
        translations,
        description,
        isActive,
        updatedBy: userId
    });
    if (!translation) {
        return res.status(404).json(new apiResponse_1.ApiResponse(false, "Translation not found"));
    }
    res.json(new apiResponse_1.ApiResponse(true, "Translation updated successfully", translation));
});
/**
 * Delete translation (Admin)
 */
exports.deleteTranslation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { key } = req.params;
    const deleted = await translationService_1.translationService.deleteTranslation(key);
    if (!deleted) {
        return res.status(404).json(new apiResponse_1.ApiResponse(false, "Translation not found"));
    }
    res.json(new apiResponse_1.ApiResponse(true, "Translation deleted successfully"));
});
/**
 * Search translations (Admin)
 */
exports.searchTranslations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { query, language, category } = req.query;
    if (!query || typeof query !== "string") {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Search query is required"));
    }
    const translations = await translationService_1.translationService.searchTranslations(query, language, category);
    res.json(new apiResponse_1.ApiResponse(true, "Search completed successfully", {
        query,
        results: translations,
        count: translations.length
    }));
});
/**
 * Get translation statistics (Admin)
 */
exports.getTranslationStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const stats = await Translation_1.Translation.aggregate([
        {
            $group: {
                _id: "$category",
                count: { $sum: 1 },
                active: { $sum: { $cond: ["$isActive", 1, 0] } },
                inactive: { $sum: { $cond: ["$isActive", 0, 1] } }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
    const totalStats = await Translation_1.Translation.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ["$isActive", 1, 0] } },
                inactive: { $sum: { $cond: ["$isActive", 0, 1] } }
            }
        }
    ]);
    res.json(new apiResponse_1.ApiResponse(true, "Translation statistics retrieved successfully", {
        byCategory: stats,
        total: totalStats[0] || { total: 0, active: 0, inactive: 0 },
        supportedLanguages: Object.values(Translation_1.SupportedLanguages),
        categories: Object.values(Translation_1.TranslationCategories)
    }));
});
/**
 * Bulk import translations (Admin)
 */
exports.bulkImportTranslations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { translations } = req.body;
    const userId = req.user.id;
    if (!Array.isArray(translations)) {
        return res.status(400).json(new apiResponse_1.ApiResponse(false, "Translations must be an array"));
    }
    const results = {
        created: 0,
        updated: 0,
        errors: []
    };
    for (const translationData of translations) {
        try {
            const existingTranslation = await Translation_1.Translation.findOne({ key: translationData.key });
            if (existingTranslation) {
                await translationService_1.translationService.updateTranslation(translationData.key, {
                    translations: translationData.translations,
                    description: translationData.description,
                    updatedBy: userId
                });
                results.updated++;
            }
            else {
                await translationService_1.translationService.createTranslation({
                    ...translationData,
                    createdBy: userId
                });
                results.created++;
            }
        }
        catch (error) {
            results.errors.push(`${translationData.key}: ${error.message}`);
        }
    }
    res.json(new apiResponse_1.ApiResponse(true, "Bulk import completed", results));
});
/**
 * Export translations (Admin)
 */
exports.exportTranslations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, language } = req.query;
    const filter = { isActive: true };
    if (category)
        filter.category = category;
    const translations = await Translation_1.Translation.find(filter).lean();
    let exportData;
    if (language) {
        // Export for specific language
        exportData = translations.reduce((acc, translation) => {
            acc[translation.key] = translation.translations[language];
            return acc;
        }, {});
    }
    else {
        // Export all languages
        exportData = translations;
    }
    res.json(new apiResponse_1.ApiResponse(true, "Translations exported successfully", {
        data: exportData,
        count: Array.isArray(exportData) ? exportData.length : Object.keys(exportData).length,
        exportedAt: new Date().toISOString()
    }));
});
