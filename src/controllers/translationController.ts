import { Request, Response } from "express";
import { translationService } from "../services/translationService";
import { Translation, SupportedLanguages, TranslationCategories } from "../models/Translation";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
// import { paginationService } from '../utils/pagination';

/**
 * Get translation by key
 */
export const getTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const language = (req.query.lang as SupportedLanguages) || SupportedLanguages.ENGLISH;

    const translation = await translationService.getTranslation(key, language);

    res.json(
        new ApiResponse(true, "Translation retrieved successfully", {
            key,
            translation,
            language
        })
    );
});

/**
 * Get multiple translations by keys
 */
export const getTranslations = asyncHandler(async (req: Request, res: Response) => {
    const { keys } = req.body;
    const language = (req.query.lang as SupportedLanguages) || SupportedLanguages.ENGLISH;

    if (!Array.isArray(keys)) {
        return res.status(400).json(new ApiResponse(false, "Keys must be an array"));
    }

    const translations = await translationService.getTranslations(keys, language);

    res.json(
        new ApiResponse(true, "Translations retrieved successfully", {
            translations,
            language,
            count: Object.keys(translations).length
        })
    );
});

/**
 * Get translations by category
 */
export const getTranslationsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params;
    const language = (req.query.lang as SupportedLanguages) || SupportedLanguages.ENGLISH;

    if (!Object.values(TranslationCategories).includes(category as TranslationCategories)) {
        return res.status(400).json(new ApiResponse(false, "Invalid category"));
    }

    const translations = await translationService.getTranslationsByCategory(
        category as TranslationCategories,
        language
    );

    res.json(
        new ApiResponse(true, "Category translations retrieved successfully", {
            category,
            translations,
            language,
            count: Object.keys(translations).length
        })
    );
});

/**
 * Get all translations for a language
 */
export const getAllTranslations = asyncHandler(async (req: Request, res: Response) => {
    const language = (req.query.lang as SupportedLanguages) || SupportedLanguages.ENGLISH;

    const translations = await translationService.getAllTranslations(language);

    res.json(
        new ApiResponse(true, "All translations retrieved successfully", {
            translations,
            language,
            count: Object.keys(translations).length
        })
    );
});

/**
 * Get paginated translations (Admin)
 */
export const getPaginatedTranslations = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as TranslationCategories;
    const search = req.query.search as string;
    const isActive = req.query.isActive;

    // Build filter
    const filter: any = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // Build query
    let query = Translation.find(filter);

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

    res.json(new ApiResponse(true, "Translations retrieved successfully", result));
});

/**
 * Create new translation (Admin)
 */
export const createTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { key, category, translations, description } = req.body;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!key || !category || !translations) {
        return res.status(400).json(new ApiResponse(false, "Key, category, and translations are required"));
    }

    // Validate category
    if (!Object.values(TranslationCategories).includes(category)) {
        return res.status(400).json(new ApiResponse(false, "Invalid category"));
    }

    // Validate translations object
    const requiredLanguages = Object.values(SupportedLanguages);
    for (const lang of requiredLanguages) {
        if (!translations[lang] || translations[lang].trim() === "") {
            return res.status(400).json(new ApiResponse(false, `Translation for ${lang} is required`));
        }
    }

    // Check if key already exists
    const existingTranslation = await Translation.findOne({ key });
    if (existingTranslation) {
        return res.status(409).json(new ApiResponse(false, "Translation key already exists"));
    }

    const translation = await translationService.createTranslation({
        key,
        category,
        translations,
        description,
        createdBy: userId
    });

    res.status(201).json(new ApiResponse(true, "Translation created successfully", translation));
});

/**
 * Update translation (Admin)
 */
export const updateTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const { translations, description, isActive } = req.body;
    const userId = (req as any).user.id;

    const translation = await translationService.updateTranslation(key, {
        translations,
        description,
        isActive,
        updatedBy: userId
    });

    if (!translation) {
        return res.status(404).json(new ApiResponse(false, "Translation not found"));
    }

    res.json(new ApiResponse(true, "Translation updated successfully", translation));
});

/**
 * Delete translation (Admin)
 */
export const deleteTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;

    const deleted = await translationService.deleteTranslation(key);

    if (!deleted) {
        return res.status(404).json(new ApiResponse(false, "Translation not found"));
    }

    res.json(new ApiResponse(true, "Translation deleted successfully"));
});

/**
 * Search translations (Admin)
 */
export const searchTranslations = asyncHandler(async (req: Request, res: Response) => {
    const { query, language, category } = req.query;

    if (!query || typeof query !== "string") {
        return res.status(400).json(new ApiResponse(false, "Search query is required"));
    }

    const translations = await translationService.searchTranslations(
        query,
        language as SupportedLanguages,
        category as TranslationCategories
    );

    res.json(
        new ApiResponse(true, "Search completed successfully", {
            query,
            results: translations,
            count: translations.length
        })
    );
});

/**
 * Get translation statistics (Admin)
 */
export const getTranslationStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await Translation.aggregate([
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

    const totalStats = await Translation.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ["$isActive", 1, 0] } },
                inactive: { $sum: { $cond: ["$isActive", 0, 1] } }
            }
        }
    ]);

    res.json(
        new ApiResponse(true, "Translation statistics retrieved successfully", {
            byCategory: stats,
            total: totalStats[0] || { total: 0, active: 0, inactive: 0 },
            supportedLanguages: Object.values(SupportedLanguages),
            categories: Object.values(TranslationCategories)
        })
    );
});

/**
 * Bulk import translations (Admin)
 */
export const bulkImportTranslations = asyncHandler(async (req: Request, res: Response) => {
    const { translations } = req.body;
    const userId = (req as any).user.id;

    if (!Array.isArray(translations)) {
        return res.status(400).json(new ApiResponse(false, "Translations must be an array"));
    }

    const results = {
        created: 0,
        updated: 0,
        errors: [] as string[]
    };

    for (const translationData of translations) {
        try {
            const existingTranslation = await Translation.findOne({ key: translationData.key });

            if (existingTranslation) {
                await translationService.updateTranslation(translationData.key, {
                    translations: translationData.translations,
                    description: translationData.description,
                    updatedBy: userId
                });
                results.updated++;
            } else {
                await translationService.createTranslation({
                    ...translationData,
                    createdBy: userId
                });
                results.created++;
            }
        } catch (error: any) {
            results.errors.push(`${translationData.key}: ${error.message}`);
        }
    }

    res.json(new ApiResponse(true, "Bulk import completed", results));
});

/**
 * Export translations (Admin)
 */
export const exportTranslations = asyncHandler(async (req: Request, res: Response) => {
    const { category, language } = req.query;

    const filter: any = { isActive: true };
    if (category) filter.category = category;

    const translations = await Translation.find(filter).lean();

    let exportData;
    if (language) {
        // Export for specific language
        exportData = translations.reduce(
            (acc, translation) => {
                acc[translation.key] = translation.translations[language as SupportedLanguages];
                return acc;
            },
            {} as Record<string, string>
        );
    } else {
        // Export all languages
        exportData = translations;
    }

    res.json(
        new ApiResponse(true, "Translations exported successfully", {
            data: exportData,
            count: Array.isArray(exportData) ? exportData.length : Object.keys(exportData).length,
            exportedAt: new Date().toISOString()
        })
    );
});
