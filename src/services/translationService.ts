import { Translation, ITranslation, SupportedLanguages, TranslationCategories } from "../models/Translation";
import { cacheService } from "./cacheService";
import { logger } from "../utils/logger";

/**
 * Translation Service with caching and optimization
 */
class TranslationService {
    private readonly CACHE_PREFIX = "translations";
    private readonly CACHE_TTL = 3600; // 1 hour
    private readonly DEFAULT_LANGUAGE = SupportedLanguages.ENGLISH;

    constructor() {
        // Listen for translation updates to invalidate cache
        Translation.on("translationUpdated", this.handleTranslationUpdate.bind(this));
    }

    /**
     * Get translation by key and language
     */
    async getTranslation(key: string, language: SupportedLanguages = this.DEFAULT_LANGUAGE): Promise<string> {
        try {
            const cacheKey = `${key}:${language}`;

            // Try cache first
            const cached = await cacheService.get<string>(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }

            // Get from database
            const translation = await Translation.findOne({ key, isActive: true }).lean();
            if (!translation) {
                logger.warn(`Translation not found for key: ${key}, language: ${language}`);
                return key; // Return key as fallback
            }

            const translatedText =
                translation.translations[language] || translation.translations[this.DEFAULT_LANGUAGE];

            // Cache the result
            await cacheService.set(this.CACHE_PREFIX, cacheKey, translatedText);

            return translatedText;
        } catch (error) {
            logger.error("Error getting translation:", error);
            return key; // Return key as fallback
        }
    }

    /**
     * Get multiple translations by keys
     */
    async getTranslations(
        keys: string[],
        language: SupportedLanguages = this.DEFAULT_LANGUAGE
    ): Promise<Record<string, string>> {
        try {
            const result: Record<string, string> = {};
            const uncachedKeys: string[] = [];

            // Check cache for each key
            for (const key of keys) {
                const cacheKey = `${key}:${language}`;
                const cached = await cacheService.get<string>(this.CACHE_PREFIX, cacheKey);
                if (cached) {
                    result[key] = cached;
                } else {
                    uncachedKeys.push(key);
                }
            }

            // Get uncached translations from database
            if (uncachedKeys.length > 0) {
                const translations = await Translation.find({ key: { $in: uncachedKeys }, isActive: true }).lean();

                for (const translation of translations) {
                    const translatedText =
                        translation.translations[language] || translation.translations[this.DEFAULT_LANGUAGE];
                    result[translation.key] = translatedText;

                    // Cache the result
                    const cacheKey = `${translation.key}:${language}`;
                    await cacheService.set(this.CACHE_PREFIX, cacheKey, translatedText);
                }

                // Add missing keys with key as fallback
                for (const key of uncachedKeys) {
                    if (!result[key]) {
                        result[key] = key;
                        logger.warn(`Translation not found for key: ${key}, language: ${language}`);
                    }
                }
            }

            return result;
        } catch (error) {
            logger.error("Error getting translations:", error);
            // Return keys as fallback
            return keys.reduce(
                (acc, key) => {
                    acc[key] = key;
                    return acc;
                },
                {} as Record<string, string>
            );
        }
    }

    /**
     * Get translations by category
     */
    async getTranslationsByCategory(
        category: TranslationCategories,
        language: SupportedLanguages = this.DEFAULT_LANGUAGE
    ): Promise<Record<string, string>> {
        try {
            const cacheKey = `category:${category}:${language}`;

            // Try cache first
            const cached = await cacheService.get<Record<string, string>>(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }

            // Get from database
            const translations = await Translation.find({ category, isActive: true }).lean();
            const result: Record<string, string> = {};

            for (const translation of translations) {
                const translatedText =
                    translation.translations[language] || translation.translations[this.DEFAULT_LANGUAGE];
                result[translation.key] = translatedText;
            }

            // Cache the result
            await cacheService.set(this.CACHE_PREFIX, cacheKey, result);

            return result;
        } catch (error) {
            logger.error("Error getting translations by category:", error);
            return {};
        }
    }

    /**
     * Get all translations for a language
     */
    async getAllTranslations(language: SupportedLanguages = this.DEFAULT_LANGUAGE): Promise<Record<string, string>> {
        try {
            const cacheKey = `all:${language}`;

            // Try cache first
            const cached = await cacheService.get<Record<string, string>>(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }

            // Get from database
            const translations = await Translation.find({ isActive: true }).lean();
            const result: Record<string, string> = {};

            for (const translation of translations) {
                const translatedText =
                    translation.translations[language] || translation.translations[this.DEFAULT_LANGUAGE];
                result[translation.key] = translatedText;
            }

            // Cache the result with shorter TTL for all translations
            await cacheService.set(this.CACHE_PREFIX, cacheKey, result);

            return result;
        } catch (error) {
            logger.error("Error getting all translations:", error);
            return {};
        }
    }

    /**
     * Create new translation
     */
    async createTranslation(data: {
        key: string;
        category: TranslationCategories;
        translations: {
            vi: string;
            en: string;
            ja: string;
        };
        description?: string;
        createdBy: string;
    }): Promise<ITranslation> {
        try {
            const translation = new Translation({
                ...data,
                updatedBy: data.createdBy
            });

            await translation.save();

            // Invalidate related caches
            await this.invalidateCache(data.key, data.category);

            logger.info(`Translation created: ${data.key}`);
            return translation;
        } catch (error) {
            logger.error("Error creating translation:", error);
            throw error;
        }
    }

    /**
     * Update translation
     */
    async updateTranslation(
        key: string,
        data: {
            translations?: {
                vi?: string;
                en?: string;
                ja?: string;
            };
            description?: string;
            isActive?: boolean;
            updatedBy: string;
        }
    ): Promise<ITranslation | null> {
        try {
            const translation = await Translation.findOne({ key });
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
            translation.updatedBy = data.updatedBy as any;

            await translation.save();

            // Invalidate related caches
            await this.invalidateCache(key, translation.category);

            logger.info(`Translation updated: ${key}`);
            return translation;
        } catch (error) {
            logger.error("Error updating translation:", error);
            throw error;
        }
    }

    /**
     * Delete translation
     */
    async deleteTranslation(key: string): Promise<boolean> {
        try {
            const translation = await Translation.findOne({ key });
            if (!translation) {
                return false;
            }

            await Translation.deleteOne({ key });

            // Invalidate related caches
            await this.invalidateCache(key, translation.category);

            logger.info(`Translation deleted: ${key}`);
            return true;
        } catch (error) {
            logger.error("Error deleting translation:", error);
            throw error;
        }
    }

    /**
     * Search translations
     */
    async searchTranslations(
        query: string,
        language?: SupportedLanguages,
        category?: TranslationCategories
    ): Promise<ITranslation[]> {
        try {
            const searchQuery: any = {
                $text: { $search: query },
                isActive: true
            };

            if (category) {
                searchQuery.category = category;
            }

            const translations = await Translation.find(searchQuery)
                .select(
                    language
                        ? `key category translations.${language} description`
                        : "key category translations description"
                )
                .sort({ score: { $meta: "textScore" } })
                .limit(50)
                .lean();

            return translations;
        } catch (error) {
            logger.error("Error searching translations:", error);
            return [];
        }
    }

    /**
     * Handle translation update events
     */
    private async handleTranslationUpdate(event: { key: string; category: TranslationCategories; action: string }) {
        await this.invalidateCache(event.key, event.category);
    }

    /**
     * Invalidate cache for translation
     */
    private async invalidateCache(key: string, category: TranslationCategories) {
        try {
            // Invalidate specific key caches for all languages
            for (const lang of Object.values(SupportedLanguages)) {
                // await cacheService.del(this.CACHE_PREFIX, `${key}:${lang}`);
                // await cacheService.del(this.CACHE_PREFIX, `category:${category}:${lang}`);
                // await cacheService.del(this.CACHE_PREFIX, `all:${lang}`);
            }
        } catch (error) {
            logger.error("Error invalidating translation cache:", error);
        }
    }
}

export const translationService = new TranslationService();
