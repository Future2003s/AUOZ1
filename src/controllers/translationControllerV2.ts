import { Request, Response } from "express";
import { translationServiceV2 } from "../services/translationServiceV2";
import { SupportedLocales, TranslationCategories } from "../models/TranslationV2";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { parseTranslationKey } from "../utils/translationKeyParser";

/**
 * Get translation by key (with locale in key or as param)
 */
export const getTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const locale = (req.query.locale as SupportedLocales) || SupportedLocales.VIETNAMESE;
    const variant = req.query.variant as string | undefined;

    const translation = await translationServiceV2.getTranslation(key, locale, variant);

    res.json(
        new ApiResponse(true, "Translation retrieved successfully", {
            key,
            translation,
            locale,
            variant
        })
    );
});

/**
 * Get multiple translations by keys
 */
export const getTranslations = asyncHandler(async (req: Request, res: Response) => {
    const { keys } = req.body;
    const locale = (req.query.locale as SupportedLocales) || SupportedLocales.VIETNAMESE;

    if (!Array.isArray(keys)) {
        return res.status(400).json(new ApiResponse(false, "Keys must be an array"));
    }

    const translations = await translationServiceV2.getTranslations(keys, locale);

    res.json(
        new ApiResponse(true, "Translations retrieved successfully", {
            translations,
            locale,
            count: Object.keys(translations).length
        })
    );
});

/**
 * Get all translations for a locale
 */
export const getAllTranslations = asyncHandler(async (req: Request, res: Response) => {
    const locale = (req.query.locale as SupportedLocales) || SupportedLocales.VIETNAMESE;

    const translations = await translationServiceV2.getAllTranslations(locale);

    res.json(
        new ApiResponse(true, "All translations retrieved successfully", {
            translations,
            locale,
            count: Object.keys(translations).length
        })
    );
});

/**
 * Get translations by baseKey (all locales)
 */
export const getTranslationsByBaseKey = asyncHandler(async (req: Request, res: Response) => {
    const { baseKey } = req.params;
    const variant = req.query.variant as string | undefined;

    const translations = await translationServiceV2.getTranslationsByBaseKey(baseKey, variant);

    res.json(
        new ApiResponse(true, "Translations retrieved successfully", {
            baseKey,
            translations,
            variant
        })
    );
});

/**
 * Create or update translation (Admin)
 */
export const upsertTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { key, value, category, description } = req.body;
    const userId = (req as any).user?._id;

    if (!key || !value || !category) {
        return res.status(400).json(
            new ApiResponse(false, "Key, value, and category are required")
        );
    }

    // Validate key has locale
    const parsed = parseTranslationKey(key);
    if (!parsed.locale) {
        return res.status(400).json(
            new ApiResponse(false, "Key must include locale suffix (e.g., _vn, _en)")
        );
    }

    if (!Object.values(TranslationCategories).includes(category)) {
        return res.status(400).json(
            new ApiResponse(false, "Invalid category")
        );
    }

    const translation = await translationServiceV2.upsertTranslation(
        key,
        value,
        category,
        userId,
        description
    );

    res.json(
        new ApiResponse(true, "Translation saved successfully", {
            translation
        })
    );
});

/**
 * Bulk import translations (Admin)
 */
export const bulkImport = asyncHandler(async (req: Request, res: Response) => {
    const { translations } = req.body;
    const userId = (req as any).user?._id;

    if (!Array.isArray(translations)) {
        return res.status(400).json(
            new ApiResponse(false, "Translations must be an array")
        );
    }

    const result = await translationServiceV2.bulkImport(translations, userId);

    res.json(
        new ApiResponse(true, "Bulk import completed", result)
    );
});

/**
 * Get paginated translations (Admin)
 */
export const getPaginatedTranslations = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const locale = req.query.locale as SupportedLocales;
    const category = req.query.category as TranslationCategories;
    const search = req.query.search as string;
    const baseKey = req.query.baseKey as string;

    const skip = (page - 1) * limit;
    const query: any = { isActive: true };

    if (locale) query.locale = locale;
    if (category) query.category = category;
    if (baseKey) query.baseKey = baseKey;
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

    res.json(
        new ApiResponse(true, "Translations retrieved successfully", {
            translations,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    );
});

