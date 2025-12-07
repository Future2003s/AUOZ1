import mongoose from "mongoose";
import { TranslationV2, ITranslationV2, SupportedLocales, TranslationCategories } from "../models/TranslationV2";
import { cacheService } from "./cacheService";
import { logger } from "../utils/logger";
import { parseTranslationKey, buildTranslationKey, resolveTranslationKey } from "../utils/translationKeyParser";

/**
 * Translation Service V2 - Supports locale in key name
 * Example: "Label_selling_point_1_vn", "Msg_selling_point_1_vn_short"
 */
class TranslationServiceV2 {
    private readonly CACHE_PREFIX = "translations_v2";
    private readonly CACHE_TTL = 3600; // 1 hour
    private readonly DEFAULT_LOCALE = SupportedLocales.VIETNAMESE;

    /**
     * Get translation by key (with locale in key name)
     * Examples:
     * - getTranslation("Label_selling_point_1_vn") -> "Miễn phí trả hàng"
     * - getTranslation("Label_selling_point_1", "vn") -> "Miễn phí trả hàng"
     */
    async getTranslation(
        keyOrBaseKey: string,
        locale?: SupportedLocales,
        variant?: string
    ): Promise<string> {
        try {
            let baseKey: string;
            let targetLocale: SupportedLocales;
            
            // Check if key already has locale suffix
            const parsed = parseTranslationKey(keyOrBaseKey);
            if (parsed.locale) {
                // Key already has locale: "Label_selling_point_1_vn"
                baseKey = parsed.baseKey;
                targetLocale = parsed.locale;
                if (parsed.variant && !variant) {
                    variant = parsed.variant;
                }
            } else {
                // Key without locale, use provided locale
                baseKey = keyOrBaseKey;
                targetLocale = locale || this.DEFAULT_LOCALE;
            }
            
            const cacheKey = `${this.CACHE_PREFIX}:${buildTranslationKey(baseKey, targetLocale, variant)}`;
            
            // Try cache first
            const cached = await cacheService.get<string>(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }
            
            // Try to get translation with fallback
            const candidates = resolveTranslationKey(baseKey, targetLocale, variant);
            
            for (const candidateKey of candidates) {
                const translation = await TranslationV2.findOne({ 
                    key: candidateKey, 
                    isActive: true 
                }).lean();
                
                if (translation) {
                    // Cache the result
                    await cacheService.set(this.CACHE_PREFIX, cacheKey, translation.value);
                    return translation.value;
                }
            }
            
            // Not found, return base key as fallback
            logger.warn(`Translation not found for key: ${keyOrBaseKey}, locale: ${targetLocale}`);
            return baseKey;
        } catch (error) {
            logger.error("Error getting translation:", error);
            return keyOrBaseKey;
        }
    }

    /**
     * Get multiple translations by keys
     */
    async getTranslations(
        keys: string[],
        locale?: SupportedLocales
    ): Promise<Record<string, string>> {
        try {
            const result: Record<string, string> = {};
            const uncachedKeys: string[] = [];
            const targetLocale = locale || this.DEFAULT_LOCALE;

            // Check cache for each key
            for (const key of keys) {
                const parsed = parseTranslationKey(key);
                const cacheKey = parsed.locale 
                    ? `${this.CACHE_PREFIX}:${key}`
                    : `${this.CACHE_PREFIX}:${buildTranslationKey(parsed.baseKey, targetLocale)}`;
                
                const cached = await cacheService.get<string>(this.CACHE_PREFIX, cacheKey);
                if (cached) {
                    result[key] = cached;
                } else {
                    uncachedKeys.push(key);
                }
            }

            // Get uncached translations from database
            if (uncachedKeys.length > 0) {
                // Build all candidate keys for lookup
                const candidateKeys: string[] = [];
                const keyMap: Map<string, string> = new Map();
                
                for (const key of uncachedKeys) {
                    const parsed = parseTranslationKey(key);
                    if (parsed.locale) {
                        candidateKeys.push(key);
                        keyMap.set(key, key);
                    } else {
                        const candidates = resolveTranslationKey(parsed.baseKey, targetLocale);
                        candidates.forEach(candidate => {
                            candidateKeys.push(candidate);
                            keyMap.set(candidate, key);
                        });
                    }
                }

                const translations = await TranslationV2.find({ 
                    key: { $in: candidateKeys }, 
                    isActive: true 
                }).lean();

                for (const translation of translations) {
                    const originalKey = keyMap.get(translation.key);
                    if (originalKey && !result[originalKey]) {
                        result[originalKey] = translation.value;
                        
                        // Cache the result
                        const cacheKey = `${this.CACHE_PREFIX}:${translation.key}`;
                        await cacheService.set(this.CACHE_PREFIX, cacheKey, translation.value);
                    }
                }

                // Add missing keys with base key as fallback
                for (const key of uncachedKeys) {
                    if (!result[key]) {
                        const parsed = parseTranslationKey(key);
                        result[key] = parsed.baseKey;
                        logger.warn(`Translation not found for key: ${key}, locale: ${targetLocale}`);
                    }
                }
            }

            return result;
        } catch (error) {
            logger.error("Error getting translations:", error);
            return keys.reduce(
                (acc, key) => {
                    const parsed = parseTranslationKey(key);
                    acc[key] = parsed.baseKey;
                    return acc;
                },
                {} as Record<string, string>
            );
        }
    }

    /**
     * Get translations by baseKey for all locales
     */
    async getTranslationsByBaseKey(
        baseKey: string,
        variant?: string
    ): Promise<Record<SupportedLocales, string>> {
        try {
            const query: any = { baseKey, isActive: true };
            if (variant) {
                query.variant = variant;
            }
            
            const translations = await TranslationV2.find(query).lean();
            const result: Partial<Record<SupportedLocales, string>> = {};
            
            for (const translation of translations) {
                result[translation.locale] = translation.value;
            }
            
            return result as Record<SupportedLocales, string>;
        } catch (error) {
            logger.error("Error getting translations by baseKey:", error);
            return {} as Record<SupportedLocales, string>;
        }
    }

    /**
     * Get all translations for a locale
     */
    async getAllTranslations(locale: SupportedLocales = this.DEFAULT_LOCALE): Promise<Record<string, string>> {
        try {
            const cacheKey = `all:${locale}`;
            
            // Try cache first
            const cached = await cacheService.get<Record<string, string>>(this.CACHE_PREFIX, cacheKey);
            if (cached) {
                return cached;
            }
            
            // Get from database
            const translations = await TranslationV2.find({ 
                locale, 
                isActive: true 
            }).lean();
            
            const result: Record<string, string> = {};
            for (const translation of translations) {
                result[translation.key] = translation.value;
            }
            
            // Cache the result
            await cacheService.set(this.CACHE_PREFIX, cacheKey, result);
            
            return result;
        } catch (error) {
            logger.error("Error getting all translations:", error);
            return {};
        }
    }

    /**
     * Create or update translation
     */
    async upsertTranslation(
        key: string,
        value: string,
        category: TranslationCategories,
        userId: mongoose.Types.ObjectId,
        description?: string
    ): Promise<ITranslationV2> {
        const parsed = parseTranslationKey(key);
        
        if (!parsed.locale) {
            throw new Error(`Key must include locale suffix: ${key}`);
        }
        
        const translation = await TranslationV2.findOneAndUpdate(
            { key },
            {
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
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );
        
        // Invalidate cache
        await this.invalidateCache(key, parsed.locale);
        
        return translation;
    }

    /**
     * Bulk import translations
     */
    async bulkImport(
        translations: Array<{
            key: string;
            value: string;
            category: TranslationCategories;
            description?: string;
        }>,
        userId: mongoose.Types.ObjectId
    ): Promise<{ success: number; failed: number; errors: string[] }> {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };
        
        for (const translation of translations) {
            try {
                await this.upsertTranslation(
                    translation.key,
                    translation.value,
                    translation.category,
                    userId,
                    translation.description
                );
                results.success++;
            } catch (error: any) {
                results.failed++;
                results.errors.push(`${translation.key}: ${error.message}`);
            }
        }
        
        return results;
    }

    /**
     * Invalidate cache for a key
     */
    private async invalidateCache(key: string, locale: SupportedLocales): Promise<void> {
        const cacheKey = `${this.CACHE_PREFIX}:${key}`;
        await cacheService.delete(this.CACHE_PREFIX, cacheKey);
        
        // Also invalidate "all" cache
        const allCacheKey = `all:${locale}`;
        await cacheService.delete(this.CACHE_PREFIX, allCacheKey);
    }
}

export const translationServiceV2 = new TranslationServiceV2();

