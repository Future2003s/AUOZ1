"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationService = void 0;
const Translation_1 = require("../models/Translation");
const cacheService_1 = require("./cacheService");
const logger_1 = require("../utils/logger");
/**
 * Translation Service with caching and optimization
 */
class TranslationService {
    CACHE_PREFIX = "translations";
    CACHE_TTL = 3600; // 1 hour
    DEFAULT_LANGUAGE = Translation_1.SupportedLanguages.ENGLISH;
    constructor() {
        // Listen for translation updates to invalidate cache
        Translation_1.Translation.on("translationUpdated", this.handleTranslationUpdate.bind(this));
    }
    /**
     * Get translation by key and language
     */
    async getTranslation(key, language = this.DEFAULT_LANGUAGE) {
        try {
            const cacheKey = `${key}:${language}`;
            // Try cache first
            const cached = await cacheService_1.cacheService.get(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }
            // Get from database
            const translation = await Translation_1.Translation.findOne({ key, isActive: true }).lean();
            if (!translation) {
                logger_1.logger.warn(`Translation not found for key: ${key}, language: ${language}`);
                return key; // Return key as fallback
            }
            const translatedText = translation.translations[language] || translation.translations[this.DEFAULT_LANGUAGE];
            // Cache the result
            await cacheService_1.cacheService.set(this.CACHE_PREFIX, cacheKey, translatedText);
            return translatedText;
        }
        catch (error) {
            logger_1.logger.error("Error getting translation:", error);
            return key; // Return key as fallback
        }
    }
    /**
     * Get multiple translations by keys
     */
    async getTranslations(keys, language = this.DEFAULT_LANGUAGE) {
        try {
            const result = {};
            const uncachedKeys = [];
            // Check cache for each key
            for (const key of keys) {
                const cacheKey = `${key}:${language}`;
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
                const translations = await Translation_1.Translation.find({ key: { $in: uncachedKeys }, isActive: true }).lean();
                for (const translation of translations) {
                    const translatedText = translation.translations[language] || translation.translations[this.DEFAULT_LANGUAGE];
                    result[translation.key] = translatedText;
                    // Cache the result
                    const cacheKey = `${translation.key}:${language}`;
                    await cacheService_1.cacheService.set(this.CACHE_PREFIX, cacheKey, translatedText);
                }
                // Add missing keys with key as fallback
                for (const key of uncachedKeys) {
                    if (!result[key]) {
                        result[key] = key;
                        logger_1.logger.warn(`Translation not found for key: ${key}, language: ${language}`);
                    }
                }
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error("Error getting translations:", error);
            // Return keys as fallback
            return keys.reduce((acc, key) => {
                acc[key] = key;
                return acc;
            }, {});
        }
    }
    /**
     * Get translations by category
     */
    async getTranslationsByCategory(category, language = this.DEFAULT_LANGUAGE) {
        try {
            const cacheKey = `category:${category}:${language}`;
            // Try cache first
            const cached = await cacheService_1.cacheService.get(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }
            // Get from database
            const translations = await Translation_1.Translation.find({ category, isActive: true }).lean();
            const result = {};
            for (const translation of translations) {
                const translatedText = translation.translations[language] || translation.translations[this.DEFAULT_LANGUAGE];
                result[translation.key] = translatedText;
            }
            // Cache the result
            await cacheService_1.cacheService.set(this.CACHE_PREFIX, cacheKey, result);
            return result;
        }
        catch (error) {
            logger_1.logger.error("Error getting translations by category:", error);
            return {};
        }
    }
    /**
     * Get all translations for a language
     */
    async getAllTranslations(language = this.DEFAULT_LANGUAGE) {
        try {
            const cacheKey = `all:${language}`;
            // Try cache first
            const cached = await cacheService_1.cacheService.get(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }
            // Get from database
            const translations = await Translation_1.Translation.find({ isActive: true }).lean();
            const result = {};
            for (const translation of translations) {
                const translatedText = translation.translations[language] || translation.translations[this.DEFAULT_LANGUAGE];
                result[translation.key] = translatedText;
            }
            // Cache the result with shorter TTL for all translations
            await cacheService_1.cacheService.set(this.CACHE_PREFIX, cacheKey, result);
            return result;
        }
        catch (error) {
            logger_1.logger.error("Error getting all translations:", error);
            return {};
        }
    }
    /**
     * Create new translation
     */
    async createTranslation(data) {
        try {
            const translation = new Translation_1.Translation({
                ...data,
                updatedBy: data.createdBy
            });
            await translation.save();
            // Invalidate related caches
            await this.invalidateCache(data.key, data.category);
            logger_1.logger.info(`Translation created: ${data.key}`);
            return translation;
        }
        catch (error) {
            logger_1.logger.error("Error creating translation:", error);
            throw error;
        }
    }
    /**
     * Update translation
     */
    async updateTranslation(key, data) {
        try {
            const translation = await Translation_1.Translation.findOne({ key });
            if (!translation) {
                throw new Error(`Translation not found: ${key}`);
            }
            // Update fields
            if (data.translations) {
                Object.assign(translation.translations, data.translations);
            }
            if (data.description !== undefined) {
                translation.description = data.description;
            }
            if (data.isActive !== undefined) {
                translation.isActive = data.isActive;
            }
            translation.updatedBy = data.updatedBy;
            await translation.save();
            // Invalidate related caches
            await this.invalidateCache(key, translation.category);
            logger_1.logger.info(`Translation updated: ${key}`);
            return translation;
        }
        catch (error) {
            logger_1.logger.error("Error updating translation:", error);
            throw error;
        }
    }
    /**
     * Delete translation
     */
    async deleteTranslation(key) {
        try {
            const translation = await Translation_1.Translation.findOne({ key });
            if (!translation) {
                return false;
            }
            await Translation_1.Translation.deleteOne({ key });
            // Invalidate related caches
            await this.invalidateCache(key, translation.category);
            logger_1.logger.info(`Translation deleted: ${key}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error("Error deleting translation:", error);
            throw error;
        }
    }
    /**
     * Search translations
     */
    async searchTranslations(query, language, category) {
        try {
            const searchQuery = {
                $text: { $search: query },
                isActive: true
            };
            if (category) {
                searchQuery.category = category;
            }
            const translations = await Translation_1.Translation.find(searchQuery)
                .select(language
                ? `key category translations.${language} description`
                : "key category translations description")
                .sort({ score: { $meta: "textScore" } })
                .limit(50)
                .lean();
            return translations;
        }
        catch (error) {
            logger_1.logger.error("Error searching translations:", error);
            return [];
        }
    }
    /**
     * Handle translation update events
     */
    async handleTranslationUpdate(event) {
        await this.invalidateCache(event.key, event.category);
    }
    /**
     * Invalidate cache for translation
     */
    async invalidateCache(key, category) {
        try {
            // Invalidate specific key caches for all languages
            for (const lang of Object.values(Translation_1.SupportedLanguages)) {
                // await cacheService.del(this.CACHE_PREFIX, `${key}:${lang}`);
                // await cacheService.del(this.CACHE_PREFIX, `category:${category}:${lang}`);
                // await cacheService.del(this.CACHE_PREFIX, `all:${lang}`);
            }
        }
        catch (error) {
            logger_1.logger.error("Error invalidating translation cache:", error);
        }
    }
}
exports.translationService = new TranslationService();
