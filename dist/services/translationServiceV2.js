"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationServiceV2 = void 0;
const TranslationV2_1 = require("../models/TranslationV2");
const cacheService_1 = require("./cacheService");
const logger_1 = require("../utils/logger");
const translationKeyParser_1 = require("../utils/translationKeyParser");
/**
 * Translation Service V2 - Supports locale in key name
 * Example: "Label_selling_point_1_vn", "Msg_selling_point_1_vn_short"
 */
class TranslationServiceV2 {
    CACHE_PREFIX = "translations_v2";
    CACHE_TTL = 3600; // 1 hour
    DEFAULT_LOCALE = TranslationV2_1.SupportedLocales.VIETNAMESE;
    /**
     * Get translation by key (with locale in key name)
     * Examples:
     * - getTranslation("Label_selling_point_1_vn") -> "Miễn phí trả hàng"
     * - getTranslation("Label_selling_point_1", "vn") -> "Miễn phí trả hàng"
     */
    async getTranslation(keyOrBaseKey, locale, variant) {
        try {
            let baseKey;
            let targetLocale;
            // Check if key already has locale suffix
            const parsed = (0, translationKeyParser_1.parseTranslationKey)(keyOrBaseKey);
            if (parsed.locale) {
                // Key already has locale: "Label_selling_point_1_vn"
                baseKey = parsed.baseKey;
                targetLocale = parsed.locale;
                if (parsed.variant && !variant) {
                    variant = parsed.variant;
                }
            }
            else {
                // Key without locale, use provided locale
                baseKey = keyOrBaseKey;
                targetLocale = locale || this.DEFAULT_LOCALE;
            }
            const cacheKey = `${this.CACHE_PREFIX}:${(0, translationKeyParser_1.buildTranslationKey)(baseKey, targetLocale, variant)}`;
            // Try cache first
            const cached = await cacheService_1.cacheService.get(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }
            // Try to get translation with fallback
            const candidates = (0, translationKeyParser_1.resolveTranslationKey)(baseKey, targetLocale, variant);
            for (const candidateKey of candidates) {
                const translation = await TranslationV2_1.TranslationV2.findOne({
                    key: candidateKey,
                    isActive: true
                }).lean();
                if (translation) {
                    // Cache the result
                    await cacheService_1.cacheService.set(this.CACHE_PREFIX, cacheKey, translation.value);
                    return translation.value;
                }
            }
            // Not found, return base key as fallback
            logger_1.logger.warn(`Translation not found for key: ${keyOrBaseKey}, locale: ${targetLocale}`);
            return baseKey;
        }
        catch (error) {
            logger_1.logger.error("Error getting translation:", error);
            return keyOrBaseKey;
        }
    }
    /**
     * Get multiple translations by keys
     */
    async getTranslations(keys, locale) {
        try {
            const result = {};
            const uncachedKeys = [];
            const targetLocale = locale || this.DEFAULT_LOCALE;
            // Check cache for each key
            for (const key of keys) {
                const parsed = (0, translationKeyParser_1.parseTranslationKey)(key);
                const cacheKey = parsed.locale
                    ? `${this.CACHE_PREFIX}:${key}`
                    : `${this.CACHE_PREFIX}:${(0, translationKeyParser_1.buildTranslationKey)(parsed.baseKey, targetLocale)}`;
                const cached = await cacheService_1.cacheService.get(this.CACHE_PREFIX, cacheKey);
                if (cached) {
                    result[key] = cached;
                }
                else {
                    uncachedKeys.push(key);
                }
            }
            // Get uncached translations from database
            if (uncachedKeys.length > 0) {
                // Build all candidate keys for lookup
                const candidateKeys = [];
                const keyMap = new Map();
                for (const key of uncachedKeys) {
                    const parsed = (0, translationKeyParser_1.parseTranslationKey)(key);
                    if (parsed.locale) {
                        candidateKeys.push(key);
                        keyMap.set(key, key);
                    }
                    else {
                        const candidates = (0, translationKeyParser_1.resolveTranslationKey)(parsed.baseKey, targetLocale);
                        candidates.forEach(candidate => {
                            candidateKeys.push(candidate);
                            keyMap.set(candidate, key);
                        });
                    }
                }
                const translations = await TranslationV2_1.TranslationV2.find({
                    key: { $in: candidateKeys },
                    isActive: true
                }).lean();
                for (const translation of translations) {
                    const originalKey = keyMap.get(translation.key);
                    if (originalKey && !result[originalKey]) {
                        result[originalKey] = translation.value;
                        // Cache the result
                        const cacheKey = `${this.CACHE_PREFIX}:${translation.key}`;
                        await cacheService_1.cacheService.set(this.CACHE_PREFIX, cacheKey, translation.value);
                    }
                }
                // Add missing keys with base key as fallback
                for (const key of uncachedKeys) {
                    if (!result[key]) {
                        const parsed = (0, translationKeyParser_1.parseTranslationKey)(key);
                        result[key] = parsed.baseKey;
                        logger_1.logger.warn(`Translation not found for key: ${key}, locale: ${targetLocale}`);
                    }
                }
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error("Error getting translations:", error);
            return keys.reduce((acc, key) => {
                const parsed = (0, translationKeyParser_1.parseTranslationKey)(key);
                acc[key] = parsed.baseKey;
                return acc;
            }, {});
        }
    }
    /**
     * Get translations by baseKey for all locales
     */
    async getTranslationsByBaseKey(baseKey, variant) {
        try {
            const query = { baseKey, isActive: true };
            if (variant) {
                query.variant = variant;
            }
            const translations = await TranslationV2_1.TranslationV2.find(query).lean();
            const result = {};
            for (const translation of translations) {
                result[translation.locale] = translation.value;
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error("Error getting translations by baseKey:", error);
            return {};
        }
    }
    /**
     * Get all translations for a locale
     */
    async getAllTranslations(locale = this.DEFAULT_LOCALE) {
        try {
            const cacheKey = `all:${locale}`;
            // Try cache first
            const cached = await cacheService_1.cacheService.get(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }
            // Get from database
            const translations = await TranslationV2_1.TranslationV2.find({
                locale,
                isActive: true
            }).lean();
            const result = {};
            for (const translation of translations) {
                result[translation.key] = translation.value;
            }
            // Cache the result
            await cacheService_1.cacheService.set(this.CACHE_PREFIX, cacheKey, result);
            return result;
        }
        catch (error) {
            logger_1.logger.error("Error getting all translations:", error);
            return {};
        }
    }
    /**
     * Create or update translation
     */
    async upsertTranslation(key, value, category, userId, description) {
        const parsed = (0, translationKeyParser_1.parseTranslationKey)(key);
        if (!parsed.locale) {
            throw new Error(`Key must include locale suffix: ${key}`);
        }
        const translation = await TranslationV2_1.TranslationV2.findOneAndUpdate({ key }, {
            key,
            baseKey: parsed.baseKey,
            locale: parsed.locale,
            variant: parsed.variant,
            category,
            value,
            description,
            isActive: true,
            updatedBy: userId,
            $setOnInsert: {
                createdBy: userId
            }
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });
        // Invalidate cache
        await this.invalidateCache(key, parsed.locale);
        return translation;
    }
    /**
     * Bulk import translations
     */
    async bulkImport(translations, userId) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        for (const translation of translations) {
            try {
                await this.upsertTranslation(translation.key, translation.value, translation.category, userId, translation.description);
                results.success++;
            }
            catch (error) {
                results.failed++;
                results.errors.push(`${translation.key}: ${error.message}`);
            }
        }
        return results;
    }
    /**
     * Invalidate cache for a key
     */
    async invalidateCache(key, locale) {
        const cacheKey = `${this.CACHE_PREFIX}:${key}`;
        await cacheService_1.cacheService.delete(this.CACHE_PREFIX, cacheKey);
        // Also invalidate "all" cache
        const allCacheKey = `all:${locale}`;
        await cacheService_1.cacheService.delete(this.CACHE_PREFIX, allCacheKey);
    }
}
exports.translationServiceV2 = new TranslationServiceV2();
